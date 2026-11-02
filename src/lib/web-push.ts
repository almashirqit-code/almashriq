import "server-only";

/**
 * Web Push without a library: VAPID sign-in (RFC 8292) and aes128gcm payload encryption (RFC 8291)
 * with WebCrypto, which Workers provides natively.
 *
 * Keys: NEXT_PUBLIC_VAPID_PUBLIC_KEY (65-byte public key, base64url) and VAPID_PRIVATE_KEY (32-byte
 * private scalar, base64url). Without them nothing is sent.
 */
export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url: string; tag?: string };

type Bytes = Uint8Array<ArrayBuffer>;
const enc = new TextEncoder();

const b64u = {
  encode(bytes: Bytes) {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode(s: string) {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  },
};

const concat = (...parts: Bytes[]): Bytes => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) (out.set(p, o), (o += p.length));
  return out;
};

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, bytes: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bytes * 8));
}

/** VAPID Authorization header for one push service (aud = its origin). */
async function vapidHeader(endpoint: string, publicKey: string, privateKey: string) {
  const pub = b64u.decode(publicKey);
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: privateKey, x: b64u.encode(pub.slice(1, 33)), y: b64u.encode(pub.slice(33, 65)), ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const claims = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: process.env.VAPID_SUBJECT || "mailto:info@almashriqtrading.site",
  };
  const unsigned = `${b64u.encode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })))}.${b64u.encode(enc.encode(JSON.stringify(claims)))}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)));
  return `vapid t=${unsigned}.${b64u.encode(sig)}, k=${publicKey}`;
}

/** Encrypts the payload for one subscription (single record, aes128gcm). */
async function encrypt(t: PushTarget, payload: Bytes) {
  const uaPublic = b64u.decode(t.p256dh);
  const authSecret = b64u.decode(t.auth);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(payload, new Uint8Array([2]))));
  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

/**
 * Sends one message. Returns "gone" when the push service says the subscription no longer exists
 * (the caller deletes it), "ok" on success and "failed" otherwise.
 */
export async function sendPush(t: PushTarget, msg: PushMessage): Promise<"ok" | "gone" | "failed"> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return "failed";
  try {
    const body = await encrypt(t, enc.encode(JSON.stringify(msg)));
    const res = await fetch(t.endpoint, {
      method: "POST",
      headers: {
        Authorization: await vapidHeader(t.endpoint, publicKey, privateKey),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(3 * 24 * 3600),
        Urgency: "normal",
        ...(msg.tag ? { Topic: msg.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) } : {}),
      },
      body,
    });
    if (res.status === 404 || res.status === 410) return "gone";
    if (!res.ok) {
      console.error("[push] send failed", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return "failed";
    }
    return "ok";
  } catch (e) {
    console.error("[push]", (e as Error).message);
    return "failed";
  }
}

export const pushConfigured = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
