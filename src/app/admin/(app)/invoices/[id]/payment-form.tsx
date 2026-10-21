"use client";

import { useActionState, useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/client";
import { SubmitButton } from "@/components/buttons";

export function PaymentForm({
  action,
  balance,
}: {
  action: (prev: { error?: string; ok?: boolean }, fd: FormData) => Promise<{ error?: string; ok?: boolean }>;
  balance: number;
}) {
  const { t } = useT();
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="grid grid-cols-2 gap-3 border-t border-slate-100 p-5">
      <div>
        <label className="label">{t("date")}</label>
        <input type="date" name="paid_on" className="input" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <div>
        <label className="label">{t("amount")}</label>
        <input type="number" name="amount" step="any" min="0" required className="input" defaultValue={balance > 0 ? balance : ""} />
      </div>
      <div>
        <label className="label">{t("inv_method")}</label>
        <select name="method" className="input">
          <option>Bank transfer (TT)</option>
          <option>Cash</option>
          <option>Credit card</option>
          <option>PayPal</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label className="label">{t("inv_reference")}</label>
        <input name="reference" className="input" />
      </div>
      <div className="col-span-2 flex items-center gap-3">
        <SubmitButton>{t("inv_add_payment")}</SubmitButton>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
