import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { signPrivateFile } from "@/lib/private-files";

/** Opens a remittance document (private document store) through a 5-minute signed link. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  await getProfile();
  const { docId } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("remittance_documents").select("path, file_name").eq("id", docId).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const download = req.nextUrl.searchParams.get("download") === "1";
  return NextResponse.redirect(await signPrivateFile("remittance-docs", doc.path, download ? doc.file_name : undefined, 300));
}
