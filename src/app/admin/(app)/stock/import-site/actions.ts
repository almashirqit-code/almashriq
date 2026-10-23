"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { siteFetch } from "@/lib/site-import/fetch";
import { SITE_ORIGIN, parseDetail, parseListing, parseStatusTags } from "@/lib/site-import/parse";

/** Car links on one /cars page (page 1 also returns the page count). */
export async function siteListPage(page: number): Promise<{ links: string[]; maxPage: number; error?: string }> {
  await assertRole(["admin", "manager"]);
  try {
    const html = await (await siteFetch(`${SITE_ORIGIN}/cars?page=${Math.max(1, Math.floor(page))}`)).text();
    return parseListing(html);
  } catch (e) {
    return { links: [], maxPage: 0, error: (e as Error).message };
  }
}

/** Sold / Reserve ribbons from the homepage, keyed by the website's car id. */
export async function siteStatusTags(): Promise<Record<string, "sold" | "reserved">> {
  await assertRole(["admin", "manager"]);
  try {
    return parseStatusTags(await (await siteFetch(`${SITE_ORIGIN}/`)).text());
  } catch {
    return {};
  }
}

export type ImportCarResult = {
  outcome: "created" | "updated" | "skipped" | "failed";
  stockNo?: string;
  vehicleId?: string;
  /** photo URLs still to copy (empty when the car already has photos) */
  images: string[];
  error?: string;
};

/**
 * Imports one car from its website page as a third-party vehicle shown on the public site.
 * Matching is by the website reference (site:<id>), so running the import again is safe.
 */
export async function importSiteCar(
  url: string,
  opts: { update: boolean; tag?: "sold" | "reserved" | null }
): Promise<ImportCarResult> {
  await assertRole(["admin", "manager"]);
  const supabase = await createClient();
  let car;
  try {
    car = parseDetail(await (await siteFetch(url)).text(), url);
  } catch (e) {
    return { outcome: "failed", images: [], error: `${url}: ${(e as Error).message}` };
  }
  if (!car) return { outcome: "failed", images: [], error: `${url}: couldn't read the car details` };

  const masked = !!car.chassis && car.chassis.includes("*");
  const row = {
    make: car.make,
    model: car.model,
    grade: car.grade,
    model_code: car.model_code,
    year: car.year,
    month: car.month,
    mileage: car.mileage,
    engine_cc: car.engine_cc,
    fuel: car.fuel,
    transmission: car.transmission,
    drive: car.drive,
    steering: car.steering,
    doors: car.doors,
    seats: car.seats,
    body_type: car.body_type,
    color: car.color,
    location: car.location,
    price: car.price,
    price_currency: "USD",
    features: car.features,
    source_url: car.url,
    notes: masked ? `Chassis (as listed on website): ${car.chassis}` : null,
  };

  const { data: existing } = await supabase
    .from("vehicles")
    .select("id, stock_no, status, vehicle_images(count)")
    .eq("source_ref", car.ref)
    .maybeSingle();

  if (existing) {
    const imageCount = (existing.vehicle_images as unknown as { count: number }[])?.[0]?.count ?? 0;
    if (opts.update) {
      const patch: Record<string, unknown> = { ...row };
      // Only follow the website's Sold/Reserve tag while the car isn't in our own sales flow.
      if (["in_stock", "reserved", "sold"].includes(existing.status as string)) {
        const [{ count: inv }, { count: res }] = await Promise.all([
          supabase.from("invoice_items").select("id", { count: "exact", head: true }).eq("vehicle_id", existing.id),
          supabase.from("reservations").select("id", { count: "exact", head: true }).eq("vehicle_id", existing.id).neq("status", "cancelled"),
        ]);
        if (!inv && !res) patch.status = opts.tag === "sold" ? "sold" : opts.tag === "reserved" ? "reserved" : "in_stock";
      }
      const { error } = await supabase.from("vehicles").update(patch).eq("id", existing.id);
      if (error) return { outcome: "failed", images: [], error: `${car.stock_no}: ${error.message}` };
    }
    return {
      outcome: opts.update ? "updated" : "skipped",
      stockNo: existing.stock_no as string,
      vehicleId: existing.id as string,
      images: imageCount === 0 ? car.images : [],
    };
  }

  const insert = {
    ...row,
    stock_no: car.stock_no,
    chassis_no: masked ? null : car.chassis,
    status: opts.tag === "sold" ? "sold" : opts.tag === "reserved" ? "reserved" : "in_stock",
    ownership: "third_party",
    supplier_name: "almashriqtrading.site",
    supplier_currency: "USD",
    show_on_website: true,
    source_ref: car.ref,
  };
  let { data, error } = await supabase.from("vehicles").insert(insert).select("id, stock_no").single();
  if (error?.code === "23505") {
    // Stock no. or chassis already used by another car: keep the car, adjust the clashing value.
    ({ data, error } = await supabase
      .from("vehicles")
      .insert({ ...insert, stock_no: `${car.stock_no}-W`, chassis_no: null, notes: [row.notes, car.chassis ? `Chassis: ${car.chassis}` : null].filter(Boolean).join("\n") || null })
      .select("id, stock_no")
      .single());
  }
  if (error || !data) return { outcome: "failed", images: [], error: `${car.stock_no}: ${error?.message ?? "insert failed"}` };
  return { outcome: "created", stockNo: data.stock_no as string, vehicleId: data.id as string, images: car.images };
}

export async function finishSiteImport() {
  await assertRole(["admin", "manager"]);
  revalidatePath("/admin/stock");
  revalidatePath("/");
  revalidatePath("/cars");
  revalidatePath("/admin");
  revalidateTag("public-site");
}
