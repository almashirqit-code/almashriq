import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signPrivateFile } from "@/lib/private-files";

/** Opens an expense receipt. Read through RLS (admins, managers of that office), then a 60-second signed URL. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.from("company_expenses").select("receipt_path, receipt_name, receipt_type").eq("id", id).maybeSingle();
  if (!data?.receipt_path) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const url = await signPrivateFile("expense-receipts", data.receipt_path, data.receipt_type === "application/pdf" ? data.receipt_name ?? "receipt.pdf" : undefined);
  if (!url) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  return NextResponse.redirect(url);
}
