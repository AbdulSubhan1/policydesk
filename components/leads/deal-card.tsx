import { getLocale, getTranslations } from "next-intl/server";
import { DetailList, Panel } from "@/components/ui";
import { money, shortDate } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { getOrder, getPolicy, getQuotes } from "@/server/queries/lead-details";

/**
 * The money side of the lead: the plan being sold, its premium, whether it is paid and whether finance has recorded
 * it. A website payment needs no finance step, so it says so instead of "Not yet".
 */
export async function DealCard({ leadId, className }: { leadId: number; className?: string }) {
  const [quotes, order, policy, t, locale] = await Promise.all([
    getQuotes(leadId),
    getOrder(leadId),
    getPolicy(leadId),
    getTranslations(),
    getLocale(),
  ]);
  const paidOnline = order?.status === "paid" ? order : undefined;
  const deal = quotes.find((q) => q.status === "accepted") ?? quotes.find((q) => q.id === paidOnline?.quoteId);
  const premium = policy?.premium ?? deal?.premium;
  const online = policy?.paymentMethod === "online" || (!policy && !!paidOnline);

  const paid =
    paidOnline?.paidAt && (!policy || online)
      ? t("lead.deal.paidOnline", { amount: money(paidOnline.amount), date: shortDate(paidOnline.paidAt) })
      : policy?.paymentStatus === "paid" && policy.paidAt
        ? t("lead.deal.paidOn", { date: shortDate(policy.paidAt) })
        : t("lead.deal.notYet");
  const recorded =
    policy?.paymentStatus === "paid" && !online && policy.paidAt
      ? shortDate(policy.paidAt)
      : online
        ? t("lead.deal.notNeeded")
        : t("lead.deal.notYet");

  return (
    <Panel
      title={t("lead.deal.title")}
      summary={premium !== undefined ? `· ${t("common.perYear", { amount: money(premium) })}` : undefined}
      collapsible
      className={className}
    >
      <DetailList
        columns={2}
        items={[
          { label: t("lead.deal.plan"), value: deal ? localized(deal.planName, locale) : t("lead.deal.noPlan") },
          {
            label: t("lead.deal.premium"),
            value: premium !== undefined && t("common.perYear", { amount: money(premium) }),
          },
          { label: t("lead.deal.paid"), value: paid },
          { label: t("lead.deal.recorded"), value: recorded },
        ]}
      />
    </Panel>
  );
}
