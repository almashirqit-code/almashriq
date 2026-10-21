import { redirect, permanentRedirect } from "next/navigation";
import { getCar, siteBase } from "@/lib/public-site";

/** Old website links (/car/details/toyota+crown+2006/36161) → the new car page. */
export default async function OldCarLink({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params;
  const [car, base] = await Promise.all([getCar(`site:${id.replace(/\D/g, "")}`), siteBase()]);
  if (car) permanentRedirect(`${base}/cars/${encodeURIComponent(car.stock_no)}`);
  redirect(`${base}/cars`);
}
