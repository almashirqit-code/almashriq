"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Anchor } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { AuctionHouse, Port, ShipmentMode, Vehicle, Yard } from "@/lib/types";

export type Masters = { ports: Port[]; auctions: AuctionHouse[]; yards: Yard[] };

/** Auction house + yard selects (grouped by port) and the resulting port shipment rule. */
export function OriginPicker({ vehicle, masters, readOnly }: { vehicle?: Partial<Vehicle>; masters: Masters; readOnly: boolean }) {
  const { t } = useT();
  const [auctionId, setAuctionId] = useState(vehicle?.auction_house_id ?? "");
  const [yardId, setYardId] = useState(vehicle?.yard_id ?? "");

  const portById = useMemo(() => new Map(masters.ports.map((p) => [p.id, p])), [masters.ports]);
  const auction = masters.auctions.find((a) => a.id === auctionId);
  const yard = masters.yards.find((y) => y.id === yardId);
  const port = (auction?.port_id && portById.get(auction.port_id)) || (yard?.port_id && portById.get(yard.port_id)) || null;

  const grouped = <T extends { id: string; name: string; port_id: string | null; active: boolean }>(items: T[], current: string) => {
    const groups = new Map<string, T[]>();
    for (const it of items) {
      if (!it.active && it.id !== current) continue;
      const key = it.port_id ?? "";
      groups.set(key, [...(groups.get(key) ?? []), it]);
    }
    return [...groups.entries()].sort(([a], [b]) => (portById.get(a)?.name ?? "~").localeCompare(portById.get(b)?.name ?? "~"));
  };

  const modes = (m: ShipmentMode[]) =>
    m.length === 1 && m[0] === "container" ? t("m_container_only") : m.map((x) => t(`m_mode_${x}` as DictKey)).join(" / ");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label className="label" htmlFor="auction_house_id">
          {t("f_auction_house")}
        </label>
        <select id="auction_house_id" name="auction_house_id" className="input" value={auctionId} disabled={readOnly} onChange={(e) => setAuctionId(e.target.value)}>
          <option value="">{t("f_select_auction")}</option>
          {grouped(masters.auctions, auctionId).map(([pid, list]) => (
            <optgroup key={pid || "none"} label={portById.get(pid)?.name ?? t("m_no_port")}>
              {list.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="yard_id">
          {t("f_yard")}
        </label>
        <select id="yard_id" name="yard_id" className="input" value={yardId} disabled={readOnly} onChange={(e) => setYardId(e.target.value)}>
          <option value="">{t("f_select_yard")}</option>
          {grouped(masters.yards, yardId).map(([pid, list]) => (
            <optgroup key={pid || "none"} label={portById.get(pid)?.name ?? t("m_no_port")}>
              {list.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        {port && (
          <div
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              port.shipment_modes.includes("roro") ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
            }`}
          >
            {port.shipment_modes.includes("roro") ? <Anchor className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{t("m_port_rule", { port: port.name, modes: modes(port.shipment_modes) })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
