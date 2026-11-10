"use client";

import { useActionState, useRef } from "react";
import { login, type LoginState } from "./actions";

const DEMO_PASSWORD = "demo1234";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@policydesk.dev", hint: "Everything, including roles and users" },
  { role: "Manager", email: "manager@policydesk.dev", hint: "All leads, assigns work, approves quotes" },
  { role: "Agent", email: "agent@policydesk.dev", hint: "Only the leads assigned to them" },
  { role: "Viewer", email: "viewer@policydesk.dev", hint: "Read-only reporting" },
];

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function loginAs(email: string) {
    emailRef.current!.value = email;
    passwordRef.current!.value = DEMO_PASSWORD;
    formRef.current!.requestSubmit();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            P
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">PolicyDesk</h1>
          <p className="mt-1 text-sm text-slate-500">Insurance sales CRM with role-based access control</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Try a demo account</h2>
          <p className="mb-4 text-xs text-slate-500">Each role sees a different app. Log in as two roles to compare.</p>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                disabled={pending}
                onClick={() => loginAs(a.email)}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
              >
                <span>
                  <span className="block text-sm font-medium text-slate-900">Log in as {a.role}</span>
                  <span className="block text-xs text-slate-500">{a.hint}</span>
                </span>
                <span className="text-indigo-600">→</span>
              </button>
            ))}
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or sign in <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form ref={formRef} action={action} className="grid gap-3">
            <input ref={emailRef} name="email" type="email" required placeholder="Email" className="input" />
            <input ref={passwordRef} name="password" type="password" required placeholder="Password" className="input" />
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <button disabled={pending} className="btn-primary">
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
