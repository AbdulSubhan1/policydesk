"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input, PhoneInput } from "@/components/ui";
import { email, firstName, fullName, lastName, phone } from "@/schemas/fields";

// Built only from schemas/fields.ts, so it shows exactly the rules every real form uses
const demoSchema = z.object({ firstName, lastName, fullName, email, phone });

/** Live playground for the shared field rules on the Component library page. */
export function ValidationDemo() {
  const t = useTranslations("designSystem.validation");
  const tp = useTranslations("placeholders");
  const form = useForm({
    resolver: zodResolver(demoSchema),
    mode: "onTouched",
    defaultValues: { firstName: "", lastName: "", fullName: "", email: "", phone: "" },
  });
  const error = (name: keyof z.input<typeof demoSchema>) => form.formState.errors[name]?.message;

  return (
    <form onSubmit={form.handleSubmit(() => undefined)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label={t("firstName")} error={error("firstName")}>
        <Input placeholder={tp("firstName")} {...form.register("firstName")} />
      </Field>
      <Field label={t("lastName")} error={error("lastName")}>
        <Input placeholder={tp("lastName")} {...form.register("lastName")} />
      </Field>
      <Field label={t("fullName")} error={error("fullName")}>
        <Input placeholder={tp("customerName")} {...form.register("fullName")} />
      </Field>
      <Field label={t("email")} error={error("email")}>
        <Input type="email" placeholder={tp("email")} {...form.register("email")} />
      </Field>
      <Field label={t("phone")} error={error("phone")} group className="sm:col-span-2">
        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <PhoneInput {...field} aria-label={t("phone")} invalid={fieldState.invalid} />
          )}
        />
      </Field>
      <Button className="justify-self-start">{t("check")}</Button>
    </form>
  );
}
