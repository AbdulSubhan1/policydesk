"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui";
import { DEPARTMENTS, PRODUCT_INFO } from "@/lib/products";
import { createOpportunity, type FormState } from "../actions";

const SOURCES = ["website", "referral", "phone", "partner", "social"];

export function OpportunityForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createOpportunity, {});

  return (
    <form action={action} className="card grid gap-4 p-6 md:grid-cols-2">
      <Field label="Customer name">
        <input name="customerName" required className="input" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required className="input" />
      </Field>
      <Field label="Phone">
        <input name="phone" required className="input" />
      </Field>
      <Field label="Insurance product">
        <select name="product" className="input">
          {DEPARTMENTS.map((d) => (
            <optgroup key={d.name} label={d.name}>
              {d.products.map((p) => (
                <option key={p} value={p}>
                  {PRODUCT_INFO[p].label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Source">
        <select name="source" className="input">
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes" className="md:col-span-2">
        <textarea name="notes" rows={3} className="input" />
      </Field>
      {state.error && <p className="text-sm text-red-600 md:col-span-2">{state.error}</p>}
      <div className="md:col-span-2">
        <button disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Create opportunity"}
        </button>
      </div>
    </form>
  );
}
