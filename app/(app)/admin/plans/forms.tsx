"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Field } from "@/components/ui";
import { DEPARTMENTS, PRODUCT_INFO, type Product } from "@/lib/products";
import { createInsurer, createPlan, type FormState } from "./actions";

function useReset(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function InsurerForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createInsurer, {});
  const ref = useReset(state);
  return (
    <form ref={ref} action={action} className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <Field label="Insurer name">
        <input name="name" required className="input" />
      </Field>
      <Field label="Partner contact email">
        <input name="contactEmail" type="email" className="input" />
      </Field>
      <button disabled={pending} className="btn-primary">
        Add insurer
      </button>
      {state.error && <p className="text-sm text-red-600 md:col-span-3">{state.error}</p>}
    </form>
  );
}

export function PlanForm({ insurers, defaultProduct }: { insurers: { id: number; name: string }[]; defaultProduct: Product }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPlan, {});
  const ref = useReset(state);
  const [product, setProduct] = useState<Product>(defaultProduct);

  return (
    <form ref={ref} action={action} className="card grid gap-3 p-5 md:grid-cols-3">
      <h2 className="text-sm font-semibold text-slate-900 md:col-span-3">Add a plan from an insurer</h2>
      <Field label="Insurer">
        <select name="insurerId" className="input">
          {insurers.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Product">
        <select name="product" value={product} onChange={(e) => setProduct(e.target.value as Product)} className="input">
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
      <Field label="Cover type">
        <select name="cover" className="input">
          {PRODUCT_INFO[product].covers.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Plan name">
        <input name="name" required placeholder="e.g. Gold Comprehensive" className="input" />
      </Field>
      <Field label="Base yearly premium">
        <input name="basePremium" type="number" min={1} required className="input" />
      </Field>
      <Field label="Excess / deductible">
        <input name="excess" type="number" min={0} defaultValue={0} className="input" />
      </Field>
      <Field label="Benefits (comma separated)" className="md:col-span-3">
        <input name="benefits" placeholder="Roadside assistance, Agency repair, Personal accident" className="input" />
      </Field>
      {state.error && <p className="text-sm text-red-600 md:col-span-3">{state.error}</p>}
      <div className="md:col-span-3">
        <button disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Add plan"}
        </button>
      </div>
    </form>
  );
}
