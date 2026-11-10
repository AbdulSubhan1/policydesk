"use client";

import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { Button, DatePicker, Field, FormError, Input } from "@/components/ui";
import { NATIONALITIES, OCCUPATIONS } from "@/constants/kyc";
import { SOURCES_OF_FUNDS, type SourceOfFunds } from "@/constants/statuses";
import { keyedOptions, plainOptions } from "@/lib/options";
import { kycSchema } from "@/schemas/kyc";
import { submitKyc } from "@/server/actions/kyc";
import { FormAutocomplete } from "./form-autocomplete";
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
  const t = useTranslations();
  const { form, pending, onSubmit, errorOf, rootError } = useActionForm(kycSchema, submitKyc, {
    defaultValues: {
      leadId,
      idNumber: saved.idNumber ?? "",
      nationality: saved.nationality ?? undefined,
      dateOfBirth: saved.dateOfBirth ?? "",
      idExpiry: saved.idExpiry ?? "",
      occupation: saved.occupation ?? undefined,
      sourceOfFunds: saved.sourceOfFunds ?? undefined,
    },
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label={t("lead.kyc.idNumber")} error={errorOf("idNumber")}>
        <Input placeholder={t("placeholders.idNumber")} {...form.register("idNumber")} />
      </Field>
      <Field label={t("lead.kyc.nationality")} error={errorOf("nationality")}>
        <FormAutocomplete
          control={form.control}
          name="nationality"
          options={plainOptions(NATIONALITIES)}
          placeholder={t("placeholders.nationality")}
        />
      </Field>
      <Field label={t("lead.kyc.dateOfBirth")} error={errorOf("dateOfBirth")} group>
        <Controller
          control={form.control}
          name="dateOfBirth"
          render={({ field, fieldState }) => (
            <DatePicker
              label={t("lead.kyc.dateOfBirth")}
              value={field.value}
              onChange={field.onChange}
              max={new Date().toISOString().slice(0, 10)}
              invalid={fieldState.invalid}
            />
          )}
        />
      </Field>
      <Field label={t("lead.kyc.idExpiry")} error={errorOf("idExpiry")} group>
        <Controller
          control={form.control}
          name="idExpiry"
          render={({ field, fieldState }) => (
            <DatePicker
              label={t("lead.kyc.idExpiry")}
              value={field.value}
              onChange={field.onChange}
              invalid={fieldState.invalid}
            />
          )}
        />
      </Field>
      <Field label={t("lead.kyc.occupation")} error={errorOf("occupation")}>
        <FormAutocomplete
          control={form.control}
          name="occupation"
          options={plainOptions(OCCUPATIONS)}
          placeholder={t("placeholders.occupation")}
        />
      </Field>
      <Field label={t("lead.kyc.sourceOfFunds")} error={errorOf("sourceOfFunds")}>
        <FormAutocomplete
          control={form.control}
          name="sourceOfFunds"
          options={keyedOptions(t, "funds", SOURCES_OF_FUNDS)}
          placeholder={t("placeholders.sourceOfFunds")}
        />
      </Field>
      <div className="grid justify-items-start gap-2 sm:col-span-2">
        <FormError message={rootError} />
        <Button variant="primary" disabled={pending}>
          {pending ? t("lead.kyc.submitting") : t("lead.kyc.submit")}
        </Button>
      </div>
    </form>
  );
}
