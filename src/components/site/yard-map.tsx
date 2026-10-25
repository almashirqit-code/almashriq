"use client";

import { MapPin, Navigation } from "lucide-react";
import { useConsent } from "./consent";
import { directionsUrl, mapEmbedUrl, SOCIAL } from "@/lib/social";

/**
 * Google Map of the yard. Google Maps sets its own cookies, so the map only loads once the visitor
 * allows "Chat, reviews & map" cookies; until then a placeholder offers the choice (and plain links).
 */
export function YardMap({ query }: { query: string }) {
  const { consent, openSettings } = useConsent();
  const allowed = !!consent?.functional;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="relative aspect-[4/3] bg-slate-100">
        {allowed ? (
          <iframe
            src={mapEmbedUrl(query)}
            title="Map: Al Mashriq Trading yard in Yuki, Ibaraki, Japan"
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-600">
            <MapPin className="h-8 w-8 text-brand-600" />
            <p>The map is provided by Google, which sets cookies.</p>
            <button type="button" onClick={openSettings} className="rounded-lg bg-navy-900 px-4 py-2 font-bold text-white hover:bg-navy-800">
              Show the map
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 p-3">
        <a
          href={directionsUrl(query)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700"
        >
          <Navigation className="h-4 w-4" /> Get directions
        </a>
        <a
          href={SOCIAL.googleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-navy-900 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          <MapPin className="h-4 w-4" /> View on Google Maps
        </a>
      </div>
    </div>
  );
}
