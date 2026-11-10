"use client";

import { useActionState } from "react";
import { PRODUCTS } from "@/lib/db/schema";
import { titleCase } from "@/lib/format";
import { createLead, type FormState } from "../actions";

const SOURCES = ["website", "referral", "phone", "partner", "social"];

export function LeadForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createLead, {});

  return (
    <form action={action} className="card grid gap-4 p-6 md:grid-cols-2">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">Customer name</span>
        <input name="customerName" required className="input" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">Email</span>
        <input name="email" type="email" required className="input" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">Phone</span>
        <input name="phone" required className="input" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">Product</span>
        <select name="product" className="input">
          {PRODUCTS.map((p) => (
            <option key={p} value={p}>
              {titleCase(p)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">Source</span>
        <select name="source" className="input">
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm md:col-span-2">
        <span className="font-medium text-slate-700">Notes</span>
        <textarea name="notes" rows={3} className="input" />
      </label>
      {state.error && <p className="text-sm text-red-600 md:col-span-2">{state.error}</p>}
      <div className="md:col-span-2">
        <button disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Create lead"}
        </button>
      </div>
    </form>
  );
}
