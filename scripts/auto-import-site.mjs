/**
 * Nightly import of NEW cars from the old website (GitHub Actions, see .github/workflows/auto-import-site.yml).
 * Runs outside Cloudflare, so it uses no Worker CPU. Listing pages are newest first: it stops as soon as three
 * pages in a row hold only known cars and never opens the page of a car it already has.
 * New cars appear on the website within an hour, when the public data cache expires.
 *
 * Needs SUPABASE_DB_URL, and R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY unless DRY_RUN=1 (reports only, writes nothing).
 */
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import pg from "pg";
import sharp from "sharp";
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { SITE_ORIGIN, parseDetail, parseListing, siteIdFromUrl } from "../src/lib/site-import/parse.ts";
import { thumbPath } from "../src/lib/format.ts";

const DRY_RUN = process.env.DRY_RUN === "1";
const R2_ENDPOINT = "https://1d9bac1d07767e76297b4a215f1d154f.r2.cloudflarestorage.com";
const BUCKET = "almashriq-photos";
const IMMUTABLE = "public, max-age=31536000, immutable";
/** More than this in one night means the old site changed: import these and leave the rest for tomorrow. */
const MAX_NEW_CARS = 100;
const STOP_AFTER_KNOWN_PAGES = 3;
// Same as src/lib/images.ts (browser only).
const THUMB_MAX = 480;
const THUMB_QUALITY = 72;

const clean = (s) => (s ?? "").replace(/\s/g, "");
const s3 = DRY_RUN
  ? null
  : new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: clean(process.env.R2_ACCESS_KEY_ID), secretAccessKey: clean(process.env.R2_SECRET_ACCESS_KEY) },
    });

async function siteFetch(url) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (AlMashriq ERP importer)" }, signal: AbortSignal.timeout(30000) });
      if (res.ok) return res;
      last = new Error(`HTTP ${res.status}`);
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error(`${url}: ${last.message}`);
}

/** Links and Sold/Reserve ribbons of the cars the ERP doesn't know yet. */
async function findNewCars(known) {
  const found = new Map();
  const tags = {};
  let knownPages = 0;
  for (let page = 1, maxPage = 1; page <= maxPage && knownPages < STOP_AFTER_KNOWN_PAGES; page++) {
    const list = parseListing(await (await siteFetch(`${SITE_ORIGIN}/cars?page=${page}`)).text());
    if (page === 1 && !list.links.length) throw new Error("Page 1 of the old site lists no cars: its layout may have changed");
    maxPage = list.maxPage;
    Object.assign(tags, list.tags);
    const fresh = list.links.filter((l) => !known.has(`site:${siteIdFromUrl(l)}`));
    fresh.forEach((l) => found.set(siteIdFromUrl(l), l));
    knownPages = fresh.length ? 0 : knownPages + 1;
    console.log(`Page ${page}: ${list.links.length} cars, ${fresh.length} new`);
  }
  return { links: [...found.values()], tags };
}

async function put(key, body, contentType) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: IMMUTABLE }));
}

/** Same sizes as the browser importer: full photo max 1280px, card thumbnail from src/lib/images.ts. */
async function copyPhotos(vehicleId, urls) {
  const paths = [];
  for (const [i, url] of urls.entries()) {
    try {
      const original = Buffer.from(await (await siteFetch(url)).arrayBuffer());
      const full = await sharp(original).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      const path = `vehicles/${vehicleId}/site-${i}-${randomUUID().slice(0, 5)}.webp`;
      await put(path, full, "image/webp");
      paths.push(path);
      const thumb = await sharp(full).resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true }).webp({ quality: THUMB_QUALITY }).toBuffer();
      await put(thumbPath(path), thumb, "image/webp").catch((e) => console.warn(`Thumbnail ${path}: ${e.message}`)); // cards fall back to the full photo
    } catch (e) {
      console.warn(`Photo ${url}: ${e.message}`);
    }
  }
  return paths;
}

async function removePhotos(paths) {
  if (!paths.length) return;
  const Objects = paths.flatMap((p) => [{ Key: p }, { Key: thumbPath(p) }]);
  await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects } })).catch((e) => console.warn(`Cleanup: ${e.message}`));
}

/** A car typed into the ERP by hand: chassis start, year and mileage all match and only one car fits. */
async function findHandEntered(db, car) {
  const prefix = (car.chassis ?? "").split("*")[0];
  if (prefix.length < 6 || !car.year || car.mileage == null) return null;
  const { rows } = await db.query(
    `select id, stock_no from public.vehicles where source_ref is null and year = $1 and mileage = $2 and chassis_no ilike $3 limit 2`,
    [car.year, car.mileage, `${prefix.replace(/[\\%_]/g, "\\$&")}%`]
  );
  return rows.length === 1 ? rows[0] : null;
}

const COLUMNS = ["id", "stock_no", "chassis_no", "status", "ownership", "supplier_name", "supplier_currency", "show_on_website", "source_ref", "source_url", "notes", "make", "model", "grade", "model_code", "year", "month", "mileage", "engine_cc", "fuel", "transmission", "drive", "steering", "doors", "seats", "body_type", "color", "location", "price", "price_currency", "features"];
const INSERT = `insert into public.vehicles (${COLUMNS.join(", ")}) values (${COLUMNS.map((c, i) => `$${i + 1}${c === "status" ? "::public.vehicle_status" : ""}`).join(", ")})`;

async function insertCar(db, id, car, tag, photos) {
  const masked = !!car.chassis && car.chassis.includes("*");
  const notes = masked ? `Chassis (as listed on website): ${car.chassis}` : null;
  const row = {
    id, stock_no: car.stock_no, chassis_no: masked ? null : car.chassis, status: tag ?? "in_stock", ownership: "third_party",
    supplier_name: "almashriqtradingjapan.com", supplier_currency: "USD", show_on_website: true, source_ref: car.ref, source_url: car.url,
    notes, make: car.make, model: car.model, grade: car.grade, model_code: car.model_code, year: car.year, month: car.month,
    mileage: car.mileage, engine_cc: car.engine_cc, fuel: car.fuel, transmission: car.transmission, drive: car.drive, steering: car.steering,
    doors: car.doors, seats: car.seats, body_type: car.body_type, color: car.color, location: car.location, price: car.price,
    price_currency: "USD", features: car.features,
  };
  const values = (r) => COLUMNS.map((c) => r[c]);
  await db.query("begin");
  try {
    await db.query("savepoint first_try");
    let stockNo = car.stock_no;
    try {
      await db.query(INSERT, values(row));
    } catch (e) {
      if (e.code !== "23505") throw e;
      // Stock no. or chassis used by another car: keep the car and adjust the clashing value, like the manual importer.
      await db.query("rollback to savepoint first_try");
      stockNo = `${car.stock_no}-W`;
      await db.query(INSERT, values({ ...row, stock_no: stockNo, chassis_no: null, notes: [notes, !masked && car.chassis ? `Chassis: ${car.chassis}` : null].filter(Boolean).join(" · ") || null }));
    }
    if (photos.length) {
      await db.query(
        `insert into public.vehicle_images (vehicle_id, path, sort_order) select $1, p, o - 1 from unnest($2::text[]) with ordinality as t(p, o)`,
        [id, photos]
      );
    }
    await db.query("commit");
    return stockNo;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

async function main() {
  const url = new URL(process.env.SUPABASE_DB_URL.trim());
  url.searchParams.delete("sslmode"); // the ssl option below decides
  const db = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await db.connect();

  const lines = [];
  const report = (l) => { console.log(l); lines.push(`- ${l}`); };
  let created = 0, linked = 0, failed = 0;
  try {
    const { rows } = await db.query(`select source_ref from public.vehicles where source_ref like 'site:%'`);
    const known = new Set(rows.map((r) => r.source_ref));
    if (!known.size) throw new Error("No imported cars found in the ERP: refusing to import the whole site");

    const { links, tags } = await findNewCars(known);
    const queue = links.reverse().slice(0, MAX_NEW_CARS); // oldest first
    if (links.length > queue.length) report(`${links.length} new cars found: importing ${queue.length} tonight, the rest tomorrow.`);

    for (const link of queue) {
      try {
        const car = parseDetail(await (await siteFetch(link)).text(), link);
        if (!car) throw new Error("couldn't read the car details");
        const same = await findHandEntered(db, car);
        if (DRY_RUN) {
          report(same ? `Would link ${car.ref} to ${same.stock_no}` : `Would import ${car.stock_no} ${car.year ?? ""} ${car.make} ${car.model} (${car.images.length} photos)`);
          continue;
        }
        if (same) {
          await db.query(`update public.vehicles set source_ref = $1, source_url = $2 where id = $3`, [car.ref, car.url, same.id]);
          report(`Linked ${car.ref} to ${same.stock_no} (already in the ERP)`);
          linked++;
          continue;
        }
        const id = randomUUID();
        const photos = await copyPhotos(id, car.images);
        // Nothing is saved without photos, so tomorrow's run tries the car again.
        if (car.images.length && !photos.length) throw new Error(`none of its ${car.images.length} photos could be copied`);
        try {
          const stockNo = await insertCar(db, id, car, tags[car.siteId] ?? null, photos);
          report(`Imported ${stockNo} ${car.year ?? ""} ${car.make} ${car.model} (${photos.length}/${car.images.length} photos)`);
          created++;
        } catch (e) {
          await removePhotos(photos);
          throw e;
        }
      } catch (e) {
        report(`FAILED ${link}: ${e.message}`);
        failed++;
      }
    }
    report(`Done: ${created} imported, ${linked} linked, ${failed} failed, ${DRY_RUN ? `${queue.length} checked (dry run)` : `${known.size} already known`}.`);
  } finally {
    await db.end();
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Website import\n${lines.join("\n")}\n`);
  }
  // A failed run makes GitHub email the repository owner.
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
