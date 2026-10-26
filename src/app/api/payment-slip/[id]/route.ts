import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signSlipFile } from "@/lib/payment-slips";

/**
 * Opens a payment slip. Read as the signed-in user: staff through RLS on payment_slips (customers
 * they can see), customers through portal_slip_file (their own slips). Then a 60-second signed URL.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: staffRow } = await supabase.from("payment_slips").select("file_path, file_name, file_type").eq("id", id).maybeSingle();
  let file = staffRow ? { path: staffRow.file_path as string, file_name: staffRow.file_name as string, file_type: staffRow.file_type as string } : null;
  if (!file) {
    const { data } = await supabase.rpc("portal_slip_file", { p_id: Number(id) });
    const row = (data as { path: string; file_name: string; file_type: string }[] | null)?.[0];
    file = row ?? null;
  }
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Photos open inline; PDFs download with their original name.
  const url = await signSlipFile(file.path, file.file_type === "application/pdf" ? file.file_name || "slip.pdf" : undefined);
  if (!url) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  return NextResponse.redirect(url);
}
