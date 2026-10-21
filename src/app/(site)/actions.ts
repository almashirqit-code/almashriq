"use server";

import { submitInquiryRpc } from "@/lib/public-site";

export type InquiryState = { ok: boolean; message: string; no?: number | null } | null;

const s = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);

export async function sendInquiry(_prev: InquiryState, fd: FormData): Promise<InquiryState> {
  // Honeypot: real visitors never fill this hidden field.
  if (s(fd, "website")) return { ok: true, message: "Thank you — we'll be in touch shortly." };
  const v = {
    name: s(fd, "name", 120),
    email: s(fd, "email", 160),
    phone: s(fd, "phone", 60),
    country: s(fd, "country", 80),
    port: s(fd, "port", 80),
    message: s(fd, "message", 4000),
    stock_no: s(fd, "stock_no", 60),
    page_url: s(fd, "page_url", 500),
    source: s(fd, "source", 30) || "website",
  };
  if (!v.name) return { ok: false, message: "Please enter your name." };
  if (!v.email && !v.phone) return { ok: false, message: "Please enter your email or WhatsApp number so we can reply." };
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return { ok: false, message: "Please enter a valid email address." };
  if (!v.message && !v.stock_no) return { ok: false, message: "Please write a short message." };
  const res = await submitInquiryRpc(v);
  if (res.error) {
    if (/too many/i.test(res.error)) return { ok: false, message: "You've sent several inquiries already — we'll reply soon. Please wait an hour before sending more." };
    return { ok: false, message: "Sorry, we couldn't send your inquiry. Please try WhatsApp or email instead." };
  }
  return { ok: true, no: res.no, message: "Thank you! Your inquiry has been received. Our sales team will reply within 24 hours." };
}
