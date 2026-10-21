import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuctionHouse, Branch, Port, Yard } from "@/lib/types";
import { mergeBranches } from "@/lib/branches";
import type { Masters } from "./origin-picker";

export async function loadMasters(): Promise<Masters> {
  const supabase = await createClient();
  const [ports, auctions, yards, branches] = await Promise.all([
    supabase.from("ports").select("*").order("name"),
    supabase.from("auction_houses").select("*").order("name").limit(5000),
    supabase.from("yards").select("*").order("name").limit(5000),
    supabase.from("branches").select("*"),
  ]);
  return {
    ports: (ports.data ?? []) as Port[],
    auctions: (auctions.data ?? []) as AuctionHouse[],
    yards: (yards.data ?? []) as Yard[],
    branches: mergeBranches(branches.data as Branch[] | null),
  };
}
