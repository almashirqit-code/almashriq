import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { zohoConfigured, signState, authorizeUrl } from "@/lib/zoho-mail";

/** Admin starts connecting a Zoho mailbox: sign in to Zoho as that mailbox and approve access. */
export async function GET() {
  const profile = await getProfile();
  if (profile.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (!zohoConfigured()) return NextResponse.redirect(new URL("/admin/inbox?error=setup", process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.almashriqtrading.site"));
  return NextResponse.redirect(authorizeUrl(signState(profile.id)));
}
