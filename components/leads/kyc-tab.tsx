import { getTranslations } from "next-intl/server";
import { KycForm } from "@/components/forms/kyc-form";
import { DetailList, EmptyState, PanelSection } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { kycPrefill } from "@/lib/kyc";
import { can } from "@/lib/rbac";
import { getKyc, getLeadContext } from "@/server/queries/lead-details";
import { ScreeningResult } from "./screening-result";

export async function KycTab({ leadId }: { leadId: number }) {
  const [{ user, opportunity, closed }, kyc, t] = await Promise.all([
    getLeadContext(leadId),
    getKyc(leadId),
    getTranslations(),
  ]);
  if (!kyc) return <EmptyState title={t("lead.kyc.none")} icon="badgeCheck" />;

  const { record } = kyc;
  const canSubmit = can(user, "kyc:submit") && !closed && (record.status === "pending" || record.status === "rejected");
  // The website form already asked some of these; the advisor checks them instead of typing them again
  const prefill = kycPrefill(opportunity.details, record);

  return (
    <PanelSection className="grid gap-5">
      {record.status !== "pending" && (
        <>
          <DetailList
            columns={3}
            items={[
              { label: t("lead.kyc.idNumber"), value: record.idNumber },
              { label: t("lead.kyc.idExpiry"), value: record.idExpiry && shortDate(record.idExpiry) },
              { label: t("lead.kyc.dateOfBirth"), value: record.dateOfBirth && shortDate(record.dateOfBirth) },
              { label: t("lead.kyc.nationality"), value: record.nationality },
              { label: t("lead.kyc.occupation"), value: record.occupation },
              { label: t("lead.kyc.sourceOfFunds"), value: record.sourceOfFunds && t(`funds.${record.sourceOfFunds}`) },
            ]}
          />
          <ScreeningResult kyc={record} />
          {record.reviewNote && (
            <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink-soft">
              {t("lead.kyc.reviewerNote", {
                name: kyc.reviewerName ?? t("lead.kyc.compliance"),
                note: record.reviewNote,
              })}
            </p>
          )}
        </>
      )}
      {record.status === "submitted" && <p className="text-sm text-muted">{t("lead.kyc.waiting")}</p>}
      {record.status === "pending" && !canSubmit && <p className="text-sm text-muted">{t("lead.kyc.notCollected")}</p>}
      {canSubmit && prefill.fromWebsite.length > 0 && (
        <p className="text-sm text-muted">{t("lead.kyc.prefilled", { count: prefill.fromWebsite.length })}</p>
      )}
      {canSubmit && (
        <KycForm leadId={leadId} saved={record} prefill={prefill.values} fromWebsite={prefill.fromWebsite} />
      )}
    </PanelSection>
  );
}
