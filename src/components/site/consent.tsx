"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";

/**
 * Cookie consent for the public website.
 *  - necessary: always on (sign-in session, language, this choice) — no banner needed for these;
 *  - analytics: Google Analytics;
 *  - functional: Tawk.to live chat and the Trustpilot widget.
 * Third-party scripts in a category load only after the visitor allows it. The choice is kept in
 * localStorage for 12 months; "Cookie settings" in the footer reopens it.
 */
export type Consent = { analytics: boolean; functional: boolean };
type Stored = Consent & { at: number; v: 1 };

const KEY = "am_consent";
const MAX_AGE = 365 * 24 * 3600 * 1000;

type Ctx = { consent: Consent | null; ready: boolean; save: (c: Consent) => void; openSettings: () => void };
const ConsentContext = createContext<Ctx>({ consent: null, ready: false, save: () => {}, openSettings: () => {} });
export const useConsent = () => useContext(ConsentContext);

function read(): Consent | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Stored | null;
    if (!s || s.v !== 1 || Date.now() - s.at > MAX_AGE) return null;
    return { analytics: !!s.analytics, functional: !!s.functional };
  } catch {
    return null;
  }
}

/** Remove Google Analytics cookies after analytics consent is withdrawn. */
function clearAnalyticsCookies() {
  const host = location.hostname.replace(/^www\./, "");
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (/^_ga/.test(name)) {
      for (const domain of ["", `; domain=${host}`, `; domain=.${host}`]) document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
    }
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    setConsent(read());
    setReady(true);
  }, []);

  const save = useCallback(
    (c: Consent) => {
      const before = consent;
      try {
        localStorage.setItem(KEY, JSON.stringify({ ...c, at: Date.now(), v: 1 } satisfies Stored));
      } catch {
        /* private mode: the choice lasts for this visit */
      }
      setConsent(c);
      setPanel(false);
      // Scripts that already ran can't be unloaded: tidy up and reload when something is withdrawn.
      if (before && ((before.analytics && !c.analytics) || (before.functional && !c.functional))) {
        if (before.analytics && !c.analytics) clearAnalyticsCookies();
        location.reload();
      }
    },
    [consent],
  );

  return (
    <ConsentContext.Provider value={{ consent, ready, save, openSettings: () => setPanel(true) }}>
      {children}
      {ready && (!consent || panel) && <ConsentBanner initial={consent} detailed={panel} onSave={save} onClose={consent ? () => setPanel(false) : undefined} />}
    </ConsentContext.Provider>
  );
}

function ConsentBanner({ initial, detailed, onSave, onClose }: { initial: Consent | null; detailed: boolean; onSave: (c: Consent) => void; onClose?: () => void }) {
  const [settings, setSettings] = useState(detailed);
  const [analytics, setAnalytics] = useState(initial?.analytics ?? false);
  const [functional, setFunctional] = useState(initial?.functional ?? false);

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[60] mx-auto max-w-2xl lg:bottom-5"
    >
      <div className="on-dark rounded-2xl bg-[#0a0a0c]/95 p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl sm:p-5">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">We use cookies</p>
            <p className="mt-1 text-xs leading-5 text-white/75">
              Necessary cookies keep the site and your account working. With your permission we also use analytics (Google Analytics) to improve the site, and live chat
              and reviews (Tawk.to, Trustpilot). See our{" "}
              <Link href="/cookies" className="font-semibold text-white underline">
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-white underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {settings && (
          <div className="mt-3 space-y-2 rounded-xl bg-white/5 p-3 text-sm">
            <Toggle label="Necessary" hint="Sign-in, language and this choice. Always on." checked disabled />
            <Toggle label="Analytics" hint="Google Analytics: anonymous visit statistics." checked={analytics} onChange={setAnalytics} />
            <Toggle label="Chat & reviews" hint="Tawk.to live chat and the Trustpilot widget." checked={functional} onChange={setFunctional} />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {settings ? (
            <button type="button" onClick={() => onSave({ analytics, functional })} className="h-11 flex-1 rounded-xl bg-white px-4 text-sm font-bold text-[#0a0a0c] hover:bg-white/90">
              Save choices
            </button>
          ) : (
            <button type="button" onClick={() => setSettings(true)} className="h-11 rounded-xl px-4 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/10">
              Settings
            </button>
          )}
          <button type="button" onClick={() => onSave({ analytics: false, functional: false })} className="h-11 flex-1 rounded-xl px-4 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/10">
            Only necessary
          </button>
          <button type="button" onClick={() => onSave({ analytics: true, functional: true })} className="h-11 flex-1 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white hover:bg-brand-700">
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className={`flex items-center justify-between gap-3 ${disabled ? "opacity-70" : "cursor-pointer"}`}>
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs text-white/60">{hint}</span>
      </span>
      <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
    </label>
  );
}

/** Footer link that reopens the choices. */
export function CookieSettingsLink({ className = "" }: { className?: string }) {
  const { openSettings } = useConsent();
  return (
    <button type="button" onClick={openSettings} className={className}>
      Cookie settings
    </button>
  );
}
