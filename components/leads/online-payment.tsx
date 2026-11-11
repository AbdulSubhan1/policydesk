import { getTranslations } from "next-intl/server";
import { Badge, DetailList, PanelSection } from "@/components/ui";
import { money, shortDate } from "@/lib/format";
import { getOrder } from "@/server/queries/lead-details";

/** The website order behind this lead, if the customer started paying online. */
export async function OnlinePayment({ leadId }: { leadId: number }) {
  const [order, t] = await Promise.all([getOrder(leadId), getTranslations("lead.policy.online")]);
  if (!order) return null;

  return (
    <PanelSection muted className="grid gap-3">
      <p className="text-sm font-medium">{t("title")}</p>
      <DetailList
        columns={2}
        items={[
          { label: t("status"), value: <Badge status={order.status} /> },
          { label: t("amount"), value: money(order.amount) },
          { label: t("paymentId"), value: order.paymentId && <span className="font-mono">{order.paymentId}</span> },
          { label: t("paidAt"), value: order.paidAt && shortDate(order.paidAt) },
        ]}
      />
    </PanelSection>
  );
}
