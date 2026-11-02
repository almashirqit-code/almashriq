import { NextResponse, type NextRequest } from "next/server";
import { assertRole } from "@/lib/auth";
import { putPrivateFile, removePrivateFile, type PrivateBucket } from "@/lib/private-files";

/** Largest remittance / vehicle document (photos are scaled down in the browser first). */
const MAX_BYTES = 15 * 1024 * 1024;

/** Staff-uploaded documents and the paths they may use (same rules as the old storage policies: admins and managers). */
const PATHS: Partial<Record<PrivateBucket, RegExp>> = {
  "remittance-docs": /^remittances\/\d+\/[\w.-]+$/,
  "vehicle-docs": /^vehicles\/[0-9a-f-]{36}\/[a-z_]+\/[\w.-]+$/,
};

async function staffOnly() {
  try {
    await assertRole(["admin", "manager"]);
    return null;
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
}

function target(bucket: string | null, path: string | null) {
  const rule = bucket ? PATHS[bucket as PrivateBucket] : undefined;
  return rule && path && rule.test(path) && !path.includes("..") ? { bucket: bucket as PrivateBucket, path } : null;
}

/** Upload: PUT /api/docs?bucket=remittance-docs&path=remittances/<id>/<file>, body = the file. */
export async function PUT(req: NextRequest) {
  const denied = await staffOnly();
  if (denied) return denied;
  const t = target(req.nextUrl.searchParams.get("bucket"), req.nextUrl.searchParams.get("path"));
  if (!t) return NextResponse.json({ error: "invalid document path" }, { status: 400 });
  const body = await req.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_BYTES) return NextResponse.json({ error: "file too large" }, { status: 413 });
  try {
    await putPrivateFile(t.bucket, t.path, body, req.headers.get("content-type") || "application/octet-stream");
    return NextResponse.json({ path: t.path });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Delete: DELETE /api/docs with body {"bucket": "...", "paths": [...]}. */
export async function DELETE(req: NextRequest) {
  const denied = await staffOnly();
  if (denied) return denied;
  const { bucket, paths } = (await req.json().catch(() => ({}))) as { bucket?: string; paths?: unknown };
  if (!Array.isArray(paths) || paths.some((p) => typeof p !== "string" || !target(bucket ?? null, p))) {
    return NextResponse.json({ error: "invalid document paths" }, { status: 400 });
  }
  await removePrivateFile(bucket as PrivateBucket, paths as string[]);
  return NextResponse.json({ deleted: paths.length });
}
