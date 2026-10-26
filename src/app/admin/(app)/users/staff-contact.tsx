"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStaffContact } from "./actions";

/** Work phone + WhatsApp for one staff member (saves when a field loses focus). Customers can verify these numbers on the website. */
export function StaffContact({ userId, phone, whatsapp }: { userId: string; phone: string | null; whatsapp: string | null }) {
  const router = useRouter();
  const [p, setP] = useState(phone ?? "");
  const [w, setW] = useState(whatsapp ?? "");
  const [pending, start] = useTransition();
  const save = () => {
    if (p === (phone ?? "") && w === (whatsapp ?? "")) return;
    start(async () => {
      try {
        await setStaffContact(userId, p, w);
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  };
  return (
    <div className={`mt-1.5 flex gap-1.5 ${pending ? "opacity-60" : ""}`}>
      <input aria-label="Work phone" placeholder="Work phone" className="input w-36 py-1.5 text-xs" type="tel" maxLength={40} value={p} disabled={pending} onChange={(e) => setP(e.target.value)} onBlur={save} />
      <input aria-label="WhatsApp" placeholder="WhatsApp" className="input w-24 py-1.5 text-xs" type="tel" maxLength={40} value={w} disabled={pending} onChange={(e) => setW(e.target.value)} onBlur={save} />
    </div>
  );
}
