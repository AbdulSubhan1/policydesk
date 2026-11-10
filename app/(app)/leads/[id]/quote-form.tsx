"use client";

import { useActionState, useEffect, useRef } from "react";
import { createQuote, type FormState } from "../actions";

const INSURERS = ["Northwind Assurance", "Bluepeak Insurance", "Harbor Mutual", "Summit General", "Crescent Cover"];

export function QuoteForm({ leadId }: { leadId: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createQuote, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-4 md:items-end">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="grid gap-1 text-sm">
        <span className="text-slate-600">Insurer</span>
        <select name="insurer" className="input">
          {INSURERS.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-600">Coverage</span>
        <select name="coverage" className="input">
          <option>Basic</option>
          <option>Standard</option>
          <option>Comprehensive</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-slate-600">Annual premium</span>
        <input name="premium" type="number" min={1} required className="input" />
      </label>
      <button disabled={pending} className="btn-primary">
        {pending ? "Adding…" : "Add quote"}
      </button>
      {state.error && <p className="text-sm text-red-600 md:col-span-4">{state.error}</p>}
    </form>
  );
}
