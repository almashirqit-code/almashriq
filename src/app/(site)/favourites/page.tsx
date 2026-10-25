import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getPortalMe } from "@/lib/portal";
import { FavouritesList } from "./favourites-list";

export const metadata: Metadata = { title: "My favourites", robots: { index: false, follow: true } };

/** Saved cars, parts and machines (kept in the browser; synced to the account for signed-in customers). */
export default async function FavouritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const me = user ? await getPortalMe() : null;
  const signedIn = !!me && me.status !== "rejected";

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      <h1 className="mb-1 text-2xl font-black">My favourites</h1>
      <p className="mb-6 text-sm text-white/70">
        {signedIn ? "Your saved items, synced to your account." : "Saved on this device. Sign in to keep them on all your devices."}
      </p>
      <FavouritesList signedIn={signedIn} agent={me?.agent?.name ?? null} />
    </section>
  );
}
