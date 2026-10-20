import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuctionHouse, Port, Yard } from "@/lib/types";
import type { Masters } from "./origin-picker";

export async function loadMasters(): Promise<Masters> {
  const supabase = await createClient();
  const [ports, auctions, yards] = await Promise.all([
    supabase.from("ports").select("*").order("name"),
    supabase.from("auction_houses").select("*").order("name").limit(5000),
    supabase.from("yards").select("*").order("name").limit(5000),
  ]);
  return {
    ports: (ports.data ?? []) as Port[],
    auctions: (auctions.data ?? []) as AuctionHouse[],
    yards: (yards.data ?? []) as Yard[],
  };
}
