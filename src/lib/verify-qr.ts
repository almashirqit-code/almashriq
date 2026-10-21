import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/public-site";

/**
 * Where printed QR codes point. A printed code can't be changed later, so it must use an address
 * that always serves this app: NEXT_PUBLIC_VERIFY_BASE if set, otherwise the project's permanent
 * Vercel production domain (VERCEL_PROJECT_PRODUCTION_URL, e.g. almashriq-pink.vercel.app — it keeps
 * working after a custom domain is added), otherwise SITE_URL.
 */
const VERIFY_BASE = (
  process.env.NEXT_PUBLIC_VERIFY_BASE ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : SITE_URL)
).replace(/\/$/, "");

/** Public page a printed QR code opens: shows the document's number, total and paid status. */
export const verifyUrl = (token: string) => `${VERIFY_BASE}/verify/${token}`;

/** QR code (inline SVG markup) for a document's verify link. */
export async function verifyQrSvg(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  return QRCode.toString(verifyUrl(token), { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0a0a0c", light: "#ffffff" } });
}
