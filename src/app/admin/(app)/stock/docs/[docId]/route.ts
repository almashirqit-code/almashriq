import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

/** Opens a vehicle document (private bucket) through a 5-minute signed URL. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  await getProfile();
  const { docId } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("vehicle_documents").select("path, file_name").eq("id", docId).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const download = req.nextUrl.searchParams.get("download") === "1";
  const { data, error } = await supabase.storage
    .from("vehicle-docs")
    .createSignedUrl(doc.path, 300, download ? { download: doc.file_name } : undefined);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Unavailable" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
