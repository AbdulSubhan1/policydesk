"use client";

import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input, Panel } from "@/components/ui";
import { roleSchema } from "@/schemas/role";
import { createRole } from "@/server/actions/roles";
import { useActionForm } from "./use-action-form";

export function RoleForm() {
  const t = useTranslations("roles");
  const tp = useTranslations("placeholders");
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(roleSchema, createRole, {
    defaultValues: { name: "", description: "" },
    resetOnSuccess: true,
  });

  return (
    <Panel>
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] md:items-start"
        noValidate
      >
        <Field label={t("newRole")} error={errorOf("name")}>
          <Input placeholder={t("newRolePlaceholder")} {...form.register("name")} />
        </Field>
        <Field label={t("roleDescription")} error={errorOf("description")}>
          <Input placeholder={tp("roleDescription")} {...form.register("description")} />
        </Field>
        <Button variant="primary" disabled={pending} className="md:mt-6">
          {t("create")}
        </Button>
        <div className="md:col-span-3">
          <FormError message={rootError} />
        </div>
      </form>
    </Panel>
  );
}
