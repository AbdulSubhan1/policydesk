"use client";

import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input } from "@/components/ui";
import { loginSchema } from "@/schemas/login";
import { login } from "@/server/actions/auth";
import { useActionForm } from "./use-action-form";

/** Email + password sign-in. The demo role buttons fill it in and submit it. */
export function LoginForm({
  demoPassword,
  demoEmails,
}: {
  demoPassword: string;
  demoEmails: { email: string; label: string; hint: string }[];
}) {
  const t = useTranslations("login");
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(loginSchema, login, {
    defaultValues: { email: "", password: "" },
  });

  function signInAs(email: string) {
    form.setValue("email", email);
    form.setValue("password", demoPassword);
    onSubmit();
  }

  return (
    <div className="grid gap-5">
      <ul className="grid gap-2">
        {demoEmails.map((account) => (
          <li key={account.email}>
            <Button type="button" variant="option" disabled={pending} onClick={() => signInAs(account.email)}>
              <span className="min-w-0">
                <span className="block truncate">{account.label}</span>
                <span className="block truncate text-xs font-normal text-muted">{account.hint}</span>
              </span>
            </Button>
          </li>
        ))}
      </ul>

      <p className="text-center text-xs text-muted">{t("or")}</p>

      <form onSubmit={onSubmit} className="grid gap-3" noValidate>
        <Field label={t("email")} error={errorOf("email")}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </Field>
        <Field label={t("password")} error={errorOf("password")}>
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </Field>
        <FormError message={rootError} />
        <Button variant="primary" disabled={pending}>
          {pending ? t("signingIn") : t("submit")}
        </Button>
      </form>
    </div>
  );
}
