import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button, CellText, DataTable, Hidden, Panel } from "@/components/ui";
import { RENEWAL_WINDOW_DAYS } from "@/constants/config";
import { RENEWAL_SOON_DAYS, daysUntil } from "@/lib/dashboard";
import { money, shortDate } from "@/lib/format";
import { leadPath } from "@/lib/reference";
import { startRenewal } from "@/server/actions/policies";

type Renewal = {
  id: number;
  policyNumber: string;
  endDate: string;
  premium: number;
  insurer: string;
  customerName: string;
  leadPublicId: string;
  advisorName: string | null;
};

/** Active policies ending soon, with who looks after them and a Renew button. */
export function RenewalsCard({ renewals, canRenew, now }: { renewals: Renewal[]; canRenew: boolean; now: Date }) {
  const t = useTranslations();
  const ends = (r: Renewal) => {
    const days = daysUntil(r.endDate, now);
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 whitespace-nowrap">
        {shortDate(r.endDate)}
        <Badge tone={days <= RENEWAL_SOON_DAYS ? "amber" : "blue"}>{t("dashboard.inDays", { days })}</Badge>
      </span>
    );
  };

  return (
    <Panel
      title={t("dashboard.renewalsTitle", { days: RENEWAL_WINDOW_DAYS })}
      actions={
        <Link href="/policies?filter=renewal_due" className="text-sm font-medium text-brand hover:text-brand-strong">
          {t("dashboard.allPolicies")}
        </Link>
      }
      flush
    >
      <DataTable
        embedded
        path="/"
        rows={renewals}
        rowKey={(r) => r.id}
        rowHref={(r) => leadPath(r.leadPublicId, "policy")}
        empty={{ title: t("dashboard.noRenewals"), icon: "shield" }}
        mobile="rows"
        summary={(r) => ({
          title: r.customerName,
          amount: money(r.premium),
          meta: [
            <span key="number" className="font-mono text-xs">
              {r.policyNumber}
            </span>,
            r.insurer,
            r.advisorName,
          ],
          date: ends(r),
        })}
        columns={[
          {
            key: "customer",
            header: t("policies.customer"),
            cell: (r) => (
              <CellText href={leadPath(r.leadPublicId, "policy")} primary={r.customerName} secondary={r.policyNumber} />
            ),
          },
          { key: "insurer", header: t("policies.insurer"), priority: 2, cell: (r) => r.insurer },
          { key: "premium", header: t("policies.premium"), numeric: true, cell: (r) => money(r.premium) },
          {
            key: "advisor",
            header: t("policies.advisor"),
            priority: 2,
            cell: (r) => r.advisorName ?? <span className="text-muted">{t("policies.noAdvisor")}</span>,
          },
          { key: "ends", header: t("policies.ends"), cell: ends },
          {
            key: "renew",
            header: <span className="sr-only">{t("policies.renew")}</span>,
            align: "end",
            cell: (r) =>
              canRenew && (
                <form action={startRenewal}>
                  <Hidden name="policyId" value={r.id} />
                  <Button size="sm" aria-label={t("dashboard.renewAria", { name: r.customerName })}>
                    {t("policies.renew")}
                  </Button>
                </form>
              ),
          },
        ]}
      />
    </Panel>
  );
}
