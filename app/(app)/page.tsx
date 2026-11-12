import { getFormatter, getTranslations } from "next-intl/server";
import { Attention } from "@/components/dashboard/attention";
import { Funnel } from "@/components/dashboard/funnel";
import { RenewalsCard } from "@/components/dashboard/renewals-card";
import { ButtonLink, Forbidden, NumberTicker, PageHeader, PillNav, Stat } from "@/components/ui";
import { TIME_ZONE } from "@/constants/config";
import { LEAD_STAGES } from "@/constants/statuses";
import {
  attentionCards,
  MIN_CLOSED_FOR_WIN_RATE,
  percentChange,
  periodFrom,
  periodRange,
  PERIODS,
  winRate,
} from "@/lib/dashboard";
import { can, scopeOf } from "@/lib/rbac";
import type { SearchParams } from "@/lib/url";
import { requireUser } from "@/server/auth";
import { dashboardStats } from "@/server/queries/dashboard";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  if (!can(user, "dashboard:view")) return <Forbidden permission="dashboard:view" />;

  const period = periodFrom((await searchParams).period);
  const now = new Date();
  const range = periodRange(period, now);
  const [stats, t, format] = await Promise.all([dashboardStats(user, range, now), getTranslations(), getFormatter()]);
  const oppScope = scopeOf(user, "opportunities");
  const leadScope = scopeOf(user, "leads");
  const policiesVisible = can(user, "policies:view");

  const monthName = (at: Date) => format.dateTime(at, { month: "long", timeZone: TIME_ZONE });
  const periodTitle =
    period === "month"
      ? t("dashboard.periodTitle.month", { month: monthName(range.start) })
      : // Years as text, or ICU would print 2,026
        t(`dashboard.periodTitle.${period}`, { quarter: range.current.quarter, year: String(range.current.year) });
  const previous =
    period === "month"
      ? monthName(range.previousStart)
      : period === "quarter"
        ? t("dashboard.quarterName", range.previous)
        : String(range.previous.year);

  const written = stats.policies.written;
  const change = percentChange(written, stats.policies.writtenBefore);
  const win = winRate(stats.leads.wonInPeriod, stats.leads.lostInPeriod);
  const sourcesTotal = stats.sources.reduce((sum, s) => sum + s.count, 0);
  const converted = stats.sources.reduce((sum, s) => sum + s.converted, 0);
  const source = (s: string) => (t.has(`sources.${s}`) ? t(`sources.${s}`) : s);

  const kpis = [
    policiesVisible && (
      <Stat
        key="written"
        label={t("dashboard.premiumWritten")}
        value={<NumberTicker value={written} format="money" />}
        delta={change === null ? undefined : { value: change, label: t("dashboard.vsPrevious", { previous }) }}
        hint={change === null ? t("dashboard.nothingBefore", { previous }) : undefined}
      />
    ),
    leadScope !== "none" && (
      <Stat
        key="open"
        label={t("dashboard.openLeads")}
        value={<NumberTicker value={stats.leads.open} />}
        href="/leads"
        hint={t(`dashboard.newInPeriod.${period}`, { count: stats.leads.newInPeriod })}
      />
    ),
    leadScope !== "none" && (
      <Stat
        key="win"
        label={t("dashboard.winRate")}
        value={
          win.rate === null ? (
            <span className="text-base font-medium text-muted">{t("dashboard.notEnoughData")}</span>
          ) : (
            <NumberTicker value={win.rate} format="percent" />
          )
        }
        hint={
          win.rate === null
            ? t("dashboard.closedSoFar", { closed: win.closed, min: MIN_CLOSED_FOR_WIN_RATE })
            : t("dashboard.wonOfClosed", { won: win.won, closed: win.closed })
        }
      />
    ),
    policiesVisible && (
      <Stat
        key="active"
        label={t("dashboard.activePolicies")}
        value={<NumberTicker value={stats.policies.active} />}
        href="/policies?filter=active"
        hint={t("dashboard.bookedWaiting", { count: stats.policies.toRecord })}
      />
    ),
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title={t("dashboard.greeting", { name: user.name.split(" ")[0] })}
        description={
          leadScope !== "none"
            ? t("dashboard.scopeNote", { scope: t(`scope.${leadScope}`) })
            : t("dashboard.roleNote", { role: user.roleName })
        }
        action={
          can(user, "opportunities:create") && (
            <ButtonLink href="/opportunities/new" variant="primary">
              {t("opportunities.new")}
            </ButtonLink>
          )
        }
      />

      <Attention
        cards={attentionCards(user)}
        now={now}
        counts={{
          kyc: stats.kyc,
          kycToSend: stats.leads.kycToSend,
          paymentsToRecord: { count: stats.policies.toRecord, amount: stats.policies.toRecordAmount },
          paidToBook: stats.paidToBook,
          unassigned: stats.leads.unassigned,
          toQuote: stats.leads.toQuote,
          renewals: stats.policies.renewalsDue,
        }}
      />

      <section aria-labelledby="period" className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="period" className="font-semibold text-ink">
            {periodTitle}
          </h2>
          <PillNav
            variant="segment"
            label={t("dashboard.period.label")}
            items={PERIODS.map((p) => ({
              href: p === PERIODS[0] ? "/" : `/?period=${p}`,
              label: t(`dashboard.period.${p}`),
              active: p === period,
            }))}
          />
        </div>
        {kpis.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis}</div>}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {leadScope !== "none" && (
          <Funnel
            title={t("dashboard.pipeline")}
            link={{ href: "/leads", label: t("dashboard.allLeads") }}
            empty={t("leads.empty")}
            steps={LEAD_STAGES.map((s) => ({
              key: s,
              label: t(`status.${s}`),
              count: stats.leadsByStage[s] ?? 0,
              href: `/leads?filter=${s}`,
              tone: s === "won" ? "brand" : s === "lost" ? "risk" : "neutral",
            }))}
          />
        )}
        {oppScope !== "none" && (
          <Funnel
            title={t("dashboard.sources")}
            link={{ href: "/opportunities", label: t("dashboard.allOpportunities") }}
            empty={t("dashboard.noSources")}
            steps={stats.sources.map((s) => ({ key: s.source, label: source(s.source), count: s.count, tone: "info" }))}
            note={
              sourcesTotal > 0 &&
              t("dashboard.becameLeads", {
                converted,
                total: sourcesTotal,
                percent: Math.round((converted / sourcesTotal) * 100),
              })
            }
          />
        )}
      </div>

      {policiesVisible && (
        <div className="mt-6">
          <RenewalsCard renewals={stats.renewals} canRenew={can(user, "policies:renew")} now={now} />
        </div>
      )}
    </>
  );
}
