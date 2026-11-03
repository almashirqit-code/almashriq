import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuctionHouse, Branch, Port, Yard } from "@/lib/types";
import { mergeBranches } from "@/lib/branches";
import { loadCatalog } from "@/lib/catalog-data";
import type { Masters } from "./origin-picker";
import { fetchAll } from "@/lib/fetch-all";

export async function loadMasters(): Promise<Masters> {
  const supabase = await createClient();
  const [ports, auctions, yards, branches, catalog] = await Promise.all([
    supabase.from("ports").select("*").order("name"),
    fetchAll((from, to) => supabase.from("auction_houses").select("*").order("name").order("id").range(from, to)).then((data) => ({ data })),
    fetchAll((from, to) => supabase.from("yards").select("*").order("name").order("id").range(from, to)).then((data) => ({ data })),
    supabase.from("branches").select("*"),
    loadCatalog("vehicle"),
  ]);
  return {
    ports: (ports.data ?? []) as Port[],
    auctions: (auctions.data ?? []) as AuctionHouse[],
    yards: (yards.data ?? []) as Yard[],
    branches: mergeBranches(branches.data as Branch[] | null),
    catalog,
  };
}
