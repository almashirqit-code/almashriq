"use client";

import { useRouter } from "next/navigation";
import { Warehouse } from "lucide-react";
import { YARD_PHOTOS } from "@/lib/photo-zip";
import { StockPhotos, type StockPhoto } from "@/components/stock-photos";

/** In-yard photos: taken at the yard, shown on the public car page under "In-yard photos". */
export function YardPhotos({ vehicleId, photos, canEdit }: { vehicleId: string; photos: StockPhoto[]; canEdit: boolean }) {
  const router = useRouter();
  return (
    <section className="card overflow-hidden">
      <div className="card-head">
        <h2 className="card-title">
          <Warehouse className="h-4 w-4" />
          In-yard photos
        </h2>
        <span className="text-xs text-slate-500">{photos.length} · shown on the website</span>
      </div>
      <div className="p-4">
        <StockPhotos table={YARD_PHOTOS} ownerId={vehicleId} photos={photos} canEdit={canEdit} onChanged={() => router.refresh()} />
      </div>
    </section>
  );
}
