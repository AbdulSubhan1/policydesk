import { getLocale, getTranslations } from "next-intl/server";
import { QuoteForm } from "@/components/forms/quote-form";
import { Badge, Button, CardBody, CellText, EmptyRow, Hidden, Table, Td, Th, Tr } from "@/components/ui";
import { money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { setQuoteStatus } from "@/server/actions/quotes";
import { getLeadContext, getPlans, getQuotes } from "@/server/queries/lead-details";

export async function QuotesTab({ leadId }: { leadId: number }) {
  const [{ user, closed }, quotes, t, locale] = await Promise.all([
    getLeadContext(leadId),
    getQuotes(leadId),
    getTranslations(),
    getLocale(),
  ]);
  const canDecide = can(user, "quotes:approve") && !closed;
  const canQuote = can(user, "quotes:create") && !closed;
  const plans = canQuote ? await getPlans(leadId) : [];

  return (
    <>
      <Table size="sm">
        <thead>
          <tr>
            <Th>{t("lead.quotes.insurerPlan")}</Th>
            <Th>{t("lead.quotes.premium")}</Th>
            <Th>{t("lead.quotes.status")}</Th>
            {canDecide && <Th className="text-end">{t("lead.quotes.decision")}</Th>}
          </tr>
        </thead>
        <tbody>
          {quotes.length === 0 && <EmptyRow colSpan={4}>{t("lead.quotes.empty")}</EmptyRow>}
          {quotes.map((q) => (
            <Tr key={q.id}>
              <Td>
                <CellText
                  primary={q.insurer}
                  secondary={`${localized(q.planName, locale)}, ${t(`covers.${q.cover}`)}`}
                />
              </Td>
              <Td>{money(q.premium)}</Td>
              <Td>
                <Badge status={q.status} />
              </Td>
              {canDecide && (
                <Td className="text-end">
                  {q.status === "sent" && (
                    <form action={setQuoteStatus} className="inline-flex gap-2">
                      <Hidden name="quoteId" value={q.id} />
                      <Button size="sm" name="status" value="accepted">
                        {t("lead.quotes.accepted")}
                      </Button>
                      <Button size="sm" variant="danger" name="status" value="rejected">
                        {t("lead.quotes.declined")}
                      </Button>
                    </form>
                  )}
                </Td>
              )}
            </Tr>
          ))}
        </tbody>
      </Table>
      {canQuote && (
        <CardBody className="bg-paper/50">
          {plans.length > 0 ? (
            <QuoteForm leadId={leadId} plans={plans} />
          ) : (
            <p className="text-sm text-muted">{t("lead.quotes.noPlans")}</p>
          )}
        </CardBody>
      )}
    </>
  );
}
