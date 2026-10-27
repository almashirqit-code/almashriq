/** Zoho times are epoch milliseconds: today → time, otherwise → date. */
export function mailTime(t: string, full = false) {
  const d = new Date(/^\d+$/.test(t) ? Number(t) : t);
  if (isNaN(d.getTime())) return "";
  if (full) return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "Name <a@b.com>" → "a@b.com" */
export const emailOf = (v: string) => (v.match(/<([^>]+)>/)?.[1] ?? v).trim().toLowerCase();

/** Every address in a To/Cc string. */
export const emailsIn = (v: string) => v.split(/[,;]/).map(emailOf).filter((x) => x.includes("@"));

/**
 * The company address an email was sent to, other than the mailbox itself — e.g. sales@ or support@
 * when the mailbox receives those groups. Null when it was sent straight to the mailbox.
 */
export function groupAddress(to: string, cc: string, mailbox: string) {
  const domain = mailbox.split("@")[1];
  return [...emailsIn(to), ...emailsIn(cc)].find((x) => x !== mailbox && x.endsWith(`@${domain}`)) ?? null;
}
