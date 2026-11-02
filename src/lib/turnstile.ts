import "server-only";
import { clientIp } from "./rate-limit";

/**
 * Checks the Cloudflare Turnstile token a public form sent (field "cf-turnstile-response").
 * Without TURNSTILE_SECRET_KEY the check is off. If Cloudflare can't be reached it lets the form
 * through: the database rate limits still apply, and real customers are never locked out.
 */
export async function passedTurnstile(fd: FormData) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  const token = String(fd.get("cf-turnstile-response") ?? "");
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: await clientIp() }),
    });
    const j = (await res.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return true;
  }
}

export const TURNSTILE_FAILED = "Please complete the security check above and try again.";
