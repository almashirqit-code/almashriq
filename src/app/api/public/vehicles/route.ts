import { NextResponse } from "next/server";
import { getShowroom } from "@/lib/showroom";
import { publicImageUrl } from "@/lib/format";

export const revalidate = 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Public vehicle feed for the company website.
 * GET /api/public/vehicles  → { count, vehicles: [...] }
 * Only vehicles marked "Show on website" that are in stock or reserved.
 */
export async function GET() {
  const { vehicles, error } = await getShowroom();
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: CORS });
  const body = {
    count: vehicles.length,
    updated_at: new Date().toISOString(),
    vehicles: vehicles.map(({ images, ...v }) => ({
      ...v,
      title: [v.year, v.make, v.model, v.grade].filter(Boolean).join(" "),
      images: images.map(publicImageUrl),
      cover: images[0] ? publicImageUrl(images[0]) : null,
    })),
  };
  return NextResponse.json(body, { headers: { ...CORS, "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
