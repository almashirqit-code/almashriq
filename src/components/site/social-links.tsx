import { Facebook, MapPin, Star } from "lucide-react";
import { SOCIAL } from "@/lib/social";

// lucide has no TikTok mark; this is the standard single-path logo.
function TikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.6c.27 0 .53.04.77.12V9.77a5.7 5.7 0 0 0-.77-.05A5.69 5.69 0 1 0 15.54 15.4V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48Z" />
    </svg>
  );
}

const ITEMS = [
  { href: SOCIAL.facebook, label: "Facebook", icon: Facebook },
  { href: SOCIAL.tiktok, label: "TikTok", icon: TikTok },
  { href: SOCIAL.googleMaps, label: "Google Maps", icon: MapPin },
  { href: SOCIAL.trustpilot, label: "Trustpilot", icon: Star },
];

/** Buttons to the company's Facebook, TikTok, Google Maps listing and Trustpilot page. */
export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/10"
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
