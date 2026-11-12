import { getLocale, getTranslations } from "next-intl/server";
import { OnlinePlanForm } from "@/components/forms/online-plan-form";
import { OnlinePayment } from "@/components/leads/online-payment";
import {
  AlertDialog,
  Badge,
  Button,
  CellText,
  DataTable,
  Hidden,
  Panel,
  PanelSection,
  type Column,
} from "@/components/ui";
import type { Product } from "@/constants/products";
import { dateTime, money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { revokePayLink } from "@/server/actions/website-payments";
import { getOnlinePayment } from "@/server/queries/online-payment";
import { PayLinkCreator } from "./pay-link-creator";

type Link = Awaited<ReturnType<typeof getOnlinePayment>>["links"][number];

/** After convert: the coordinator picks the plan with the customer and sends a payment link for the website. */
export async function OnlinePaymentPanel({
  opportunityId,
  leadId,
  product,
  details,
}: {
  opportunityId: number;
  leadId: number;
  product: Product;
  details: Record<string, string | number | boolean>;
}) {
  const [{ plans, selection, paid, links }, t, locale] = await Promise.all([
    getOnlinePayment(leadId, product, details),
    getTranslations(),
    getLocale(),
  ]);

  const columns: Column<Link>[] = [
    {
      key: "created",
      header: t("opportunities.online.created"),
      nowrap: true,
      cell: (l) => <CellText primary={dateTime(l.createdAt)} secondary={l.creatorName ?? undefined} />,
    },
    { key: "expires", header: t("opportunities.online.expires"), nowrap: true, cell: (l) => dateTime(l.expiresAt) },
    {
      key: "opened",
      header: t("opportunities.online.opened"),
      nowrap: true,
      cell: (l) => (l.openedAt ? dateTime(l.openedAt) : "—"),
    },
    { key: "status", header: t("opportunities.online.status"), cell: (l) => <Badge status={l.state} /> },
    {
      key: "revoke",
      header: "",
      align: "end",
      cell: (l) =>
        l.state === "active" && (
          <form action={revokePayLink}>
            <Hidden name="id" value={opportunityId} />
            <Hidden name="linkId" value={l.id} />
            <AlertDialog
              trigger={
                <Button type="button" size="sm" variant="danger">
                  {t("opportunities.online.revoke")}
                </Button>
              }
              title={t("opportunities.online.revokeTitle")}
              description={t("opportunities.online.revokeBody")}
              confirmLabel={t("opportunities.online.revoke")}
            />
          </form>
        ),
    },
  ];

  return (
    <Panel
      flush
      title={t("opportunities.online.title")}
      description={paid ? t("opportunities.online.paidBody") : t("opportunities.online.body")}
    >
      {!paid && (
        <PanelSection>
          {plans.length > 0 ? (
            <OnlinePlanForm
              opportunityId={opportunityId}
              saved={selection && { planId: selection.planId, addOnIds: selection.addOnIds }}
              plans={plans.map(({ plan, insurer, addOns }) => ({
                id: plan.id,
                name: localized(plan.name, locale),
                insurer,
                cover: plan.cover,
                basePremium: plan.basePremium,
                addOns: addOns.map((a) => ({
                  id: a.id,
                  name: localized(a.name, locale),
                  kind: a.kind,
                  price: a.price,
                })),
              }))}
            />
          ) : (
            <p className="text-sm text-muted">{t("lead.quotes.noPlans")}</p>
          )}
        </PanelSection>
      )}
      {!paid && (
        <PanelSection muted>
          {selection ? (
            <div className="grid gap-3">
              <p className="text-sm">
                {t("opportunities.online.linkCharges", {
                  plan: `${selection.insurer} ${selection.planName}`,
                  total: money(selection.total),
                })}
              </p>
              <PayLinkCreator opportunityId={opportunityId} hasLinks={links.length > 0} />
            </div>
          ) : (
            <p className="text-sm text-muted">{t("opportunities.online.chooseFirst")}</p>
          )}
        </PanelSection>
      )}
      <DataTable
        embedded
        path={`/opportunities/${opportunityId}`}
        rows={links}
        rowKey={(l) => l.id}
        columns={columns}
        minWidth="sm"
        empty={{ title: t("opportunities.online.noLinks"), icon: "clipboard" }}
      />
      <OnlinePayment leadId={leadId} />
    </Panel>
  );
}
