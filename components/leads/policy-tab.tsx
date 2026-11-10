import { getTranslations } from "next-intl/server";
import {
  AlertDialog,
  Badge,
  Button,
  ButtonLink,
  DetailList,
  EmptyState,
  Field,
  Hidden,
  PanelSection,
  Input,
  Autocomplete,
} from "@/components/ui";
import { PAYMENT_METHODS } from "@/constants/statuses";
import { money, shortDate } from "@/lib/format";
import { keyedOptions } from "@/lib/options";
import { can } from "@/lib/rbac";
import { leadPath } from "@/lib/reference";
import { cancelPolicy, issuePolicy, recordPayment, startRenewal } from "@/server/actions/policies";
import { getDocuments, getKyc, getLeadContext, getPolicy, getQuotes } from "@/server/queries/lead-details";

export async function PolicyTab({ leadId }: { leadId: number }) {
  const [{ user }, policy, quotes, kyc, docs, t] = await Promise.all([
    getLeadContext(leadId),
    getPolicy(leadId),
    getQuotes(leadId),
    getKyc(leadId),
    getDocuments(leadId),
    getTranslations(),
  ]);

  if (!policy) {
    const accepted = quotes.find((q) => q.status === "accepted");
    const blockers = [
      !accepted && t("lead.policy.needsQuote"),
      kyc?.record.status !== "approved" && t("lead.policy.needsKyc"),
      docs.missing.length > 0 &&
        t("lead.policy.needsDocuments", { list: docs.missing.map((d) => d.name.en).join(", ") }),
    ].filter((b): b is string => !!b);

    if (!accepted || blockers.length > 0) {
      return (
        <EmptyState
          icon="shield"
          title={t("lead.policy.notReady")}
          description={
            <ul className="mt-2 grid gap-1 text-start">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          }
        />
      );
    }
    return (
      <PanelSection className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {t("lead.policy.ready", { insurer: accepted.insurer, amount: money(accepted.premium) })}
        </p>
        {can(user, "policies:issue") && (
          <form action={issuePolicy}>
            <Hidden name="quoteId" value={accepted.id} />
            <Button variant="primary">{t("lead.policy.book")}</Button>
          </form>
        )}
      </PanelSection>
    );
  }

  const canPay = can(user, "payments:record") && policy.status !== "cancelled" && policy.paymentStatus !== "refunded";

  return (
    <PanelSection className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium">{policy.policyNumber}</p>
          <p className="text-sm text-muted">
            {t("lead.policy.period", {
              start: shortDate(policy.startDate),
              end: shortDate(policy.endDate),
              amount: money(policy.premium),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge status={policy.status} />
          <Badge status={policy.paymentStatus}>
            {t("lead.policy.payment", { status: t(`status.${policy.paymentStatus}`) })}
          </Badge>
        </div>
      </div>

      <DetailList
        columns={3}
        items={[
          {
            label: t("lead.policy.paymentMethod"),
            value: policy.paymentMethod && t(`paymentMethods.${policy.paymentMethod}`),
          },
          { label: t("lead.policy.reference"), value: policy.paymentReference },
          { label: t("lead.policy.paidOn"), value: policy.paidAt && shortDate(policy.paidAt) },
        ]}
      />

      {canPay && (
        <form
          action={recordPayment}
          className="grid grid-cols-1 gap-3 rounded-lg border border-line p-4 sm:grid-cols-4 sm:items-end"
        >
          <Hidden name="policyId" value={policy.id} />
          <Field label={t("lead.policy.recordPayment")}>
            <Autocomplete
              name="paymentStatus"
              defaultValue={policy.paymentStatus === "paid" ? "refunded" : "paid"}
              options={keyedOptions(t, "status", policy.paymentStatus === "paid" ? ["refunded"] : ["paid", "failed"])}
            />
          </Field>
          <Field label={t("lead.policy.method")}>
            <Autocomplete
              name="paymentMethod"
              defaultValue={policy.paymentMethod ?? "card"}
              options={keyedOptions(t, "paymentMethods", PAYMENT_METHODS)}
            />
          </Field>
          <Field label={t("lead.policy.reference")}>
            <Input
              name="paymentReference"
              defaultValue={policy.paymentReference ?? ""}
              placeholder={t("placeholders.reference")}
            />
          </Field>
          <Button>{t("lead.policy.savePayment")}</Button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {policy.renewalPublicId ? (
          <ButtonLink href={leadPath(policy.renewalPublicId)}>{t("lead.policy.openRenewal")}</ButtonLink>
        ) : (
          policy.status === "active" &&
          can(user, "policies:renew") && (
            <form action={startRenewal}>
              <Hidden name="policyId" value={policy.id} />
              <Button variant="primary">{t("lead.policy.startRenewal")}</Button>
            </form>
          )
        )}
        {policy.status !== "cancelled" && can(user, "policies:cancel") && (
          <form action={cancelPolicy}>
            <Hidden name="policyId" value={policy.id} />
            <AlertDialog
              trigger={
                <Button type="button" variant="danger">
                  {t("lead.policy.cancelPolicy")}
                </Button>
              }
              title={t("lead.policy.cancelTitle", { number: policy.policyNumber })}
              description={t("lead.policy.cancelBody")}
              confirmLabel={t("lead.policy.cancelPolicy")}
            />
          </form>
        )}
      </div>
    </PanelSection>
  );
}
