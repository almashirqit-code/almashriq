import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { checkState, connectMailbox, zohoConfigured } from "@/lib/zoho-mail";

/** Zoho sends the admin back here with a one-time code; the mailbox connection is stored server-side. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/inbox?${q}`, req.nextUrl.origin));
  const profile = await getProfile();
  if (profile.role !== "admin" || !zohoConfigured()) return back("error=denied");
  if (sp.get("error")) return back(`error=${encodeURIComponent(sp.get("error")!.slice(0, 60))}`);
  const code = sp.get("code");
  if (!code || !checkState(sp.get("state") ?? "", profile.id)) return back("error=expired");
  const r = await connectMailbox(code, sp.get("accounts-server") ?? "https://accounts.zoho.com", profile.id);
  return r.email ? back(`connected=${encodeURIComponent(r.email)}`) : back(`error=${encodeURIComponent(r.error ?? "failed")}`);
}
