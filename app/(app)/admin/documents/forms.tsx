"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field } from "@/components/ui";
import { createDocumentType, type FormState } from "./actions";

export function DocumentTypeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createDocumentType, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[1fr_2fr_auto] md:items-end">
      <Field label="New document type">
        <input name="name" required placeholder="e.g. Emirates ID" className="input" />
      </Field>
      <Field label="Description shown to staff">
        <input name="description" className="input" />
      </Field>
      <button disabled={pending} className="btn-primary">
        Add
      </button>
      {state.error && <p className="text-sm text-red-600 md:col-span-3">{state.error}</p>}
    </form>
  );
}
