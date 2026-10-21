import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/public-site";

/** Public page a printed QR code opens: shows the document's number, total and paid status. */
export const verifyUrl = (token: string) => `${SITE_URL}/verify/${token}`;

/** QR code (inline SVG markup) for a document's verify link. */
export async function verifyQrSvg(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  return QRCode.toString(verifyUrl(token), { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0a0a0c", light: "#ffffff" } });
}
