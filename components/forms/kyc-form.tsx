"use client";

import { useTranslations } from "next-intl";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import { NATIONALITIES, OCCUPATIONS } from "@/constants/kyc";
import { SOURCES_OF_FUNDS, type SourceOfFunds } from "@/constants/statuses";
import { kycSchema } from "@/schemas/kyc";
import { submitKyc } from "@/server/actions/kyc";
import { useActionForm } from "./use-action-form";

type Saved = {
  idNumber: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  idExpiry: string | null;
  occupation: string | null;
  sourceOfFunds: SourceOfFunds | null;
};

/** Collects KYC; the server runs the screening and sends it to compliance. Prefilled after a rejection or renewal. */
export function KycForm({ leadId, saved }: { leadId: number; saved: Saved }) {
  const t = useTranslations("lead.kyc");
  const tf = useTranslations("funds");
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(kycSchema, submitKyc, {
    defaultValues: {
      leadId,
      idNumber: saved.idNumber ?? "",
      nationality: saved.nationality ?? NATIONALITIES[0],
      dateOfBirth: saved.dateOfBirth ?? "",
      idExpiry: saved.idExpiry ?? "",
      occupation: saved.occupation ?? OCCUPATIONS[0],
      sourceOfFunds: saved.sourceOfFunds ?? "salary",
    },
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label={t("idNumber")} error={errorOf("idNumber")}>
        <Input {...form.register("idNumber")} />
      </Field>
      <Field label={t("nationality")} error={errorOf("nationality")}>
        <Select {...form.register("nationality")}>
          {NATIONALITIES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </Select>
      </Field>
      <Field label={t("dateOfBirth")} error={errorOf("dateOfBirth")}>
        <Input type="date" {...form.register("dateOfBirth")} />
      </Field>
      <Field label={t("idExpiry")} error={errorOf("idExpiry")}>
        <Input type="date" {...form.register("idExpiry")} />
      </Field>
      <Field label={t("occupation")} error={errorOf("occupation")}>
        <Select {...form.register("occupation")}>
          {OCCUPATIONS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </Field>
      <Field label={t("sourceOfFunds")} error={errorOf("sourceOfFunds")}>
        <Select {...form.register("sourceOfFunds")}>
          {SOURCES_OF_FUNDS.map((s) => (
            <option key={s} value={s}>
              {tf(s)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid justify-items-start gap-2 sm:col-span-2">
        <FormError message={rootError} />
        <Button variant="primary" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
