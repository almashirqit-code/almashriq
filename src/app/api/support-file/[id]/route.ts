import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signChatFile } from "@/lib/support-files";

/**
 * Opens a support chat attachment. The message is read as the signed-in user, so RLS decides
 * (the customer's own thread, or staff who can see it); then a 60-second signed URL is issued.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: msg } = await supabase.from("support_messages").select("attachment_path, attachment_name, attachment_type").eq("id", id).maybeSingle();
  if (!msg?.attachment_path) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Photos open inline; PDFs download with their original name.
  const url = await signChatFile(msg.attachment_path, msg.attachment_type === "application/pdf" ? msg.attachment_name ?? "document.pdf" : undefined);
  if (!url) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  return NextResponse.redirect(url);
}
