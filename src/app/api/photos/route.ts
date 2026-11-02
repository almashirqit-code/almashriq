import { NextResponse, type NextRequest } from "next/server";
import { assertRole } from "@/lib/auth";
import { deletePhotos, isPhotoPath, putPhoto } from "@/lib/photo-store";

/** Largest listing photo we accept (browser-side resizing keeps them far smaller). */
const MAX_BYTES = 15 * 1024 * 1024;

async function staffOnly() {
  try {
    await assertRole(["admin", "manager"]);
    return null;
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}

/** Upload one photo: PUT /api/photos?path=vehicles/<id>/<file>, body = the image bytes. */
export async function PUT(req: NextRequest) {
  const denied = await staffOnly();
  if (denied) return denied;
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!isPhotoPath(path)) return NextResponse.json({ error: "invalid photo path" }, { status: 400 });
  const type = req.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return NextResponse.json({ error: "not an image" }, { status: 400 });
  const body = await req.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_BYTES) return NextResponse.json({ error: "file too large" }, { status: 413 });
  try {
    await putPhoto(path, body, type);
    return NextResponse.json({ path });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Delete photos: DELETE /api/photos with body {"paths": [...]}. */
export async function DELETE(req: NextRequest) {
  const denied = await staffOnly();
  if (denied) return denied;
  const { paths } = (await req.json().catch(() => ({}))) as { paths?: unknown };
  if (!Array.isArray(paths) || paths.some((p) => typeof p !== "string")) return NextResponse.json({ error: "paths required" }, { status: 400 });
  try {
    await deletePhotos(paths as string[]);
    return NextResponse.json({ deleted: paths.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
