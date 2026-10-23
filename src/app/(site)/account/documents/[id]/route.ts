import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Customer document download. Ownership is checked as the signed-in customer (portal_document_file only
 * returns customer-facing documents of their own cars); then the private file is opened through a
 * 60-second signed URL. Customers have no storage access of their own.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.rpc("portal_document_file", { p_id: id });
  const doc = ((data ?? []) as { path: string; file_name: string }[])[0];
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed, error } = await createAdminClient().storage.from("vehicle-docs").createSignedUrl(doc.path, 60, { download: doc.file_name });
  if (error || !signed) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
