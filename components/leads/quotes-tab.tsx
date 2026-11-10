import { getLocale, getTranslations } from "next-intl/server";
import { QuoteForm } from "@/components/forms/quote-form";
import { Badge, Button, CellText, DataTable, Hidden, PanelSection, type Column } from "@/components/ui";
import { money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { leadPath } from "@/lib/reference";
import { setQuoteStatus } from "@/server/actions/quotes";
import { getLeadContext, getPlans, getQuotes } from "@/server/queries/lead-details";

type Quote = Awaited<ReturnType<typeof getQuotes>>[number];

export async function QuotesTab({ leadId }: { leadId: number }) {
  const [{ user, lead, closed }, quotes, t, locale] = await Promise.all([
    getLeadContext(leadId),
    getQuotes(leadId),
    getTranslations(),
    getLocale(),
  ]);
  const canDecide = can(user, "quotes:approve") && !closed;
  const canQuote = can(user, "quotes:create") && !closed;
  const plans = canQuote ? await getPlans(leadId) : [];

  const columns: Column<Quote>[] = [
    {
      key: "plan",
      header: t("lead.quotes.insurerPlan"),
      cell: (q) => (
        <CellText
          primary={q.insurer}
          secondary={`${q.reference}, ${localized(q.planName, locale)}, ${t(`covers.${q.cover}`)}`}
        />
      ),
    },
    { key: "premium", header: t("lead.quotes.premium"), align: "end", nowrap: true, cell: (q) => money(q.premium) },
    { key: "status", header: t("lead.quotes.status"), cell: (q) => <Badge status={q.status} /> },
  ];
  if (canDecide) {
    columns.push({
      key: "decision",
      header: t("lead.quotes.decision"),
      align: "end",
      cell: (q) =>
        q.status === "sent" && (
          <form action={setQuoteStatus} className="inline-flex gap-2">
            <Hidden name="quoteId" value={q.id} />
            <Button size="sm" name="status" value="accepted">
              {t("lead.quotes.accepted")}
            </Button>
            <Button size="sm" variant="danger" name="status" value="rejected">
              {t("lead.quotes.declined")}
            </Button>
          </form>
        ),
    });
  }

  return (
    <>
      <DataTable
        embedded
        path={leadPath(lead.publicId)}
        rows={quotes}
        rowKey={(q) => q.id}
        columns={columns}
        minWidth="sm"
        empty={{ title: t("lead.quotes.emptyTitle"), description: t("lead.quotes.empty"), icon: "clipboard" }}
      />
      {canQuote && (
        <PanelSection muted>
          {plans.length > 0 ? (
            <QuoteForm leadId={leadId} plans={plans} />
          ) : (
            <p className="text-sm text-muted">{t("lead.quotes.noPlans")}</p>
          )}
        </PanelSection>
      )}
    </>
  );
}
