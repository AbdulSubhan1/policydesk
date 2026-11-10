"use client";

import { useActionState } from "react";
import { createRole, type FormState } from "./actions";

export function RoleForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createRole, {});

  return (
    <form action={action} className="card grid gap-3 p-5 md:grid-cols-[1fr_2fr_auto] md:items-end">
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">New role</span>
        <input name="name" required placeholder="e.g. Underwriter" className="input" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-slate-700">Description</span>
        <input name="description" placeholder="What this role is for" className="input" />
      </label>
      <button disabled={pending} className="btn-primary">
        {pending ? "Creating…" : "Create role"}
      </button>
      {state.error && <p className="text-sm text-red-600 md:col-span-3">{state.error}</p>}
    </form>
  );
}
