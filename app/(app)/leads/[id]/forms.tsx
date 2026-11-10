"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Field } from "@/components/ui";
import { SOURCES_OF_FUNDS } from "@/lib/db/schema";
import { money } from "@/lib/format";
import { NATIONALITIES, OCCUPATIONS } from "@/lib/kyc";
import { createQuote, submitKyc, uploadDocument, type FormState } from "../actions";

function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export type PlanOption = {
  id: number;
  name: string;
  insurer: string;
  cover: string;
  basePremium: number;
  excess: number;
  benefits: string[];
};

export function QuoteForm({ leadId, plans }: { leadId: number; plans: PlanOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createQuote, {});
  const [planId, setPlanId] = useState(plans[0]?.id);
  const [premium, setPremium] = useState(plans[0]?.basePremium ?? 0);
  const plan = plans.find((p) => p.id === planId);

  if (plans.length === 0) {
    return <p className="border-t border-slate-100 p-5 text-sm text-slate-500">No active plans for this product. Add some under Insurers &amp; plans.</p>;
  }

  const insurers = [...new Set(plans.map((p) => p.insurer))];

  return (
    <form action={action} className="grid gap-3 border-t border-slate-100 p-5">
      <input type="hidden" name="leadId" value={leadId} />
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end">
        <Field label="Plan">
          <select
            name="planId"
            value={planId}
            onChange={(e) => {
              const next = plans.find((p) => p.id === Number(e.target.value))!;
              setPlanId(next.id);
              setPremium(next.basePremium);
            }}
            className="input"
          >
            {insurers.map((insurer) => (
              <optgroup key={insurer} label={insurer}>
                {plans
                  .filter((p) => p.insurer === insurer)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.cover} · {money(p.basePremium)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Premium offered">
          <input name="premium" type="number" min={1} value={premium} onChange={(e) => setPremium(Number(e.target.value))} className="input" />
        </Field>
        <button disabled={pending} className="btn-primary">
          {pending ? "Adding…" : "Add quote"}
        </button>
      </div>
      {plan && (
        <p className="text-xs text-slate-500">
          Excess {money(plan.excess)}
          {plan.benefits.length > 0 && <> · {plan.benefits.join(" · ")}</>}
        </p>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export type KycDefaults = {
  idNumber: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  idExpiry: string | null;
  occupation: string | null;
  sourceOfFunds: string | null;
};

export function KycForm({ leadId, defaults }: { leadId: number; defaults: KycDefaults }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitKyc, {});

  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="leadId" value={leadId} />
      <Field label="ID / passport number">
        <input name="idNumber" defaultValue={defaults.idNumber ?? ""} required className="input" />
      </Field>
      <Field label="Nationality">
        <select name="nationality" defaultValue={defaults.nationality ?? NATIONALITIES[0]} className="input">
          {NATIONALITIES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </Field>
      <Field label="Date of birth">
        <input name="dateOfBirth" type="date" defaultValue={defaults.dateOfBirth ?? ""} required className="input" />
      </Field>
      <Field label="ID expiry">
        <input name="idExpiry" type="date" defaultValue={defaults.idExpiry ?? ""} required className="input" />
      </Field>
      <Field label="Occupation">
        <select name="occupation" defaultValue={defaults.occupation ?? OCCUPATIONS[0]} className="input">
          {OCCUPATIONS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </Field>
      <Field label="Source of funds">
        <select name="sourceOfFunds" defaultValue={defaults.sourceOfFunds ?? "salary"} className="input">
          {SOURCES_OF_FUNDS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </Field>
      {state.error && <p className="text-sm text-red-600 md:col-span-2">{state.error}</p>}
      <div className="md:col-span-2">
        <button disabled={pending} className="btn-primary">
          {pending ? "Screening…" : "Run screening & submit to compliance"}
        </button>
      </div>
    </form>
  );
}

export function UploadForm({ leadId, types }: { leadId: number; types: { id: number; name: string; required: boolean }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadDocument, {});
  const ref = useResetOnSuccess(state);

  return (
    <form ref={ref} action={action} className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <input type="hidden" name="leadId" value={leadId} />
      <Field label="Document type">
        <select name="documentTypeId" className="input">
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.required ? " (required)" : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="File (PDF or image, max 2 MB)">
        <input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required className="input !py-1.5" />
      </Field>
      <button disabled={pending} className="btn-primary">
        {pending ? "Uploading…" : "Upload"}
      </button>
      {state.error && <p className="text-sm text-red-600 md:col-span-3">{state.error}</p>}
    </form>
  );
}
