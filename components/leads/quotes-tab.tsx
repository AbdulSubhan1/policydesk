import { getLocale, getTranslations } from "next-intl/server";
import { QuoteForm } from "@/components/forms/quote-form";
import { Avatar, Badge, Button, EmptyState, Hidden, Panel, PanelSection, PriceBreakdown } from "@/components/ui";
import { dateTime, money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { quoteBreakdown } from "@/lib/quote-price";
import { can } from "@/lib/rbac";
import { setQuoteStatus } from "@/server/actions/quotes";
import { getLeadContext, getOrder, getPlans, getQuotes } from "@/server/queries/lead-details";

type Quote = Awaited<ReturnType<typeof getQuotes>>[number];

/**
 * One card per quote: the plan first, then insurer, cover and excess, the price line by line and who made it. The
 * advisor adds a quote from the form underneath.
 */
export async function QuotesTab({ leadId }: { leadId: number }) {
  const [{ user, closed }, quotes, order, t, locale] = await Promise.all([
    getLeadContext(leadId),
    getQuotes(leadId),
    getOrder(leadId),
    getTranslations(),
    getLocale(),
  ]);
  const canDecide = can(user, "quotes:approve") && !closed;
  const canQuote = can(user, "quotes:create") && !closed;
  const plans = canQuote ? await getPlans(leadId) : [];
  const paidQuoteId = order?.status === "paid" ? order.quoteId : undefined;

  function card(q: Quote) {
    const planName = localized(q.planName, locale);
    const price = quoteBreakdown(q);
    // Website quotes hold what the customer ticked themselves
    const byWebsite = q.creatorName === null;
    return (
      <Panel key={q.id}>
        <article className="grid gap-4" aria-label={planName}>
          <header className="flex items-start gap-3">
            <Avatar name={q.insurer} />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold [overflow-wrap:anywhere] text-ink">{planName}</h3>
              <p className="text-sm text-muted">
                {q.insurer} · {t(`covers.${q.cover}`)}
                {q.planExcess !== null && ` · ${t("lead.quotes.excessShort", { amount: money(q.planExcess) })}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {q.status === "rejected" ? (
                <Badge tone="grey">{t("lead.quotes.notChosen")}</Badge>
              ) : (
                <Badge status={q.status} />
              )}
              {q.id === paidQuoteId && <Badge tone="green">{t("lead.quotes.paidOnline")}</Badge>}
            </div>
          </header>
          <PriceBreakdown
            caption={t("lead.quotes.breakdownCaption", { plan: planName })}
            lines={[
              { label: t("lead.quotes.planLine"), amount: money(price.plan) },
              ...price.addOns.map((a) =>
                a.kind === "included"
                  ? { label: localized(a.name, locale), amount: t("lead.quotes.included"), tone: "included" as const }
                  : {
                      label: (
                        <>
                          {localized(a.name, locale)}
                          {byWebsite && (
                            <span className="ms-1 text-xs text-muted">{t("lead.quotes.customerTicked")}</span>
                          )}
                        </>
                      ),
                      amount: money(a.price),
                    },
              ),
              ...(price.discount > 0
                ? [{ label: t("lead.quotes.discount"), amount: `−${money(price.discount)}`, tone: "minus" as const }]
                : []),
              ...(price.adjustment !== 0
                ? [
                    {
                      label: t("lead.quotes.insurerPrice"),
                      amount: price.adjustment < 0 ? `−${money(-price.adjustment)}` : `+${money(price.adjustment)}`,
                      tone: price.adjustment < 0 ? ("minus" as const) : undefined,
                    },
                  ]
                : []),
            ]}
            total={{ label: t("lead.quotes.totalYear"), amount: money(price.total) }}
          />
          <footer className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {q.creatorName === null
                ? t("lead.quotes.madeByWebsite", { reference: q.reference, date: dateTime(q.createdAt) })
                : t("lead.quotes.madeBy", { name: q.creatorName, reference: q.reference, date: dateTime(q.createdAt) })}
            </p>
            {canDecide && q.status === "sent" && (
              <form action={setQuoteStatus} className="flex flex-wrap gap-2">
                <Hidden name="quoteId" value={q.id} />
                <Button size="sm" variant="primary" name="status" value="accepted">
                  {t("lead.quotes.markAccepted")}
                </Button>
                <Button size="sm" variant="ghost" name="status" value="rejected">
                  {t("lead.quotes.markNotChosen")}
                </Button>
              </form>
            )}
          </footer>
        </article>
      </Panel>
    );
  }

  return (
    <>
      <PanelSection>
        {quotes.length > 0 ? (
          <div className="grid gap-4">{quotes.map(card)}</div>
        ) : (
          <EmptyState title={t("lead.quotes.emptyTitle")} description={t("lead.quotes.empty")} icon="clipboard" />
        )}
      </PanelSection>
      {canQuote && (
        <PanelSection muted className="grid gap-4">
          <div>
            <h3 className="font-semibold text-ink">{t("lead.quotes.addTitle")}</h3>
            <p className="text-sm text-muted">{t("lead.quotes.addDescription")}</p>
          </div>
          {plans.length > 0 ? (
            <QuoteForm key={quotes.length} leadId={leadId} plans={plans} />
          ) : (
            <p className="text-sm text-muted">{t("lead.quotes.noPlans")}</p>
          )}
        </PanelSection>
      )}
    </>
  );
}
