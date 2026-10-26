/** Staff contact rules, shared by the Users page forms and their server actions. */

/** Digits of a phone number; a usable international WhatsApp number has 8–15. */
export const phoneDigits = (v: string) => v.replace(/\D/g, "");

export function validWhatsapp(v: string) {
  const d = phoneDigits(v);
  return /^\+?[\d\s\-().]+$/.test(v.trim()) && d.length >= 8 && d.length <= 15;
}

/** wa.me chat link, to check the number really opens a WhatsApp chat. */
export const waLink = (v: string | null | undefined) => {
  const d = phoneDigits(v ?? "").replace(/^0+/, "");
  return d.length >= 8 ? `https://wa.me/${d}` : null;
};
