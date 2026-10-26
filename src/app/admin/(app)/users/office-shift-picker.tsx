"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOfficeShift } from "./actions";

/** Inline office + shift selects for one staff member (saves on change). */
export function OfficeShiftPicker({
  userId,
  office,
  shift,
  offices,
  shifts,
}: {
  userId: string;
  office: string | null;
  shift: string | null;
  offices: string[];
  shifts: string[];
}) {
  const router = useRouter();
  const [o, setO] = useState(office ?? "");
  const [s, setS] = useState(shift ?? "");
  const [pending, start] = useTransition();
  const save = (nextO: string, nextS: string) =>
    start(async () => {
      try {
        await setOfficeShift(userId, nextO || null, nextS || null);
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  // Keep values that aren't in the lists any more selectable.
  const officeList = o && !offices.includes(o) ? [o, ...offices] : offices;
  const shiftList = s && !shifts.includes(s) ? [s, ...shifts] : shifts;
  return (
    <div className={`flex gap-1.5 ${pending ? "opacity-60" : ""}`}>
      <select
        aria-label="Office"
        className="input w-40 py-1.5 text-sm"
        value={o}
        disabled={pending}
        onChange={(e) => {
          setO(e.target.value);
          save(e.target.value, s);
        }}
      >
        <option value="">— all offices —</option>
        {officeList.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <select
        aria-label="Shift"
        className="input w-28 py-1.5 text-sm"
        value={s}
        disabled={pending}
        onChange={(e) => {
          setS(e.target.value);
          save(o, e.target.value);
        }}
      >
        <option value="">—</option>
        {shiftList.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </div>
  );
}
