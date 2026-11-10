import { getTranslations } from "next-intl/server";
import { Funnel } from "@/components/dashboard/funnel";
import { RenewalsCard } from "@/components/dashboard/renewals-card";
import { Forbidden, NumberTicker, PageHeader, Stat } from "@/components/ui";
import { LEAD_STAGES, OPPORTUNITY_STATUSES } from "@/constants/statuses";
import { can, scopeOf } from "@/lib/rbac";
import { requireUser } from "@/server/auth";
import { dashboardStats } from "@/server/queries/dashboard";

const sum = (counts: Partial<Record<string, number>>) =>
  Object.values(counts).reduce<number>((a, b) => a + (b ?? 0), 0);

export default async function DashboardPage() {
  const user = await requireUser();
  if (!can(user, "dashboard:view")) return <Forbidden permission="dashboard:view" />;

  const [stats, t] = await Promise.all([dashboardStats(user), getTranslations()]);
  const oppScope = scopeOf(user, "opportunities");
  const leadScope = scopeOf(user, "leads");
  const won = stats.leadsByStage.won ?? 0;
  const lost = stats.leadsByStage.lost ?? 0;

  const tiles = [
    oppScope !== "none" && {
      label: t("dashboard.opportunities"),
      value: <NumberTicker value={sum(stats.oppsByStatus)} />,
      href: "/opportunities",
    },
    leadScope !== "none" && {
      label: t("dashboard.openLeads"),
      value: <NumberTicker value={sum(stats.leadsByStage) - won - lost} />,
      href: "/leads",
    },
    leadScope !== "none" && {
      label: t("dashboard.winRate"),
      value: <NumberTicker value={won + lost ? Math.round((won / (won + lost)) * 100) : 0} format="percent" />,
    },
    can(user, "kyc:review") && {
      label: t("dashboard.kycToReview"),
      value: <NumberTicker value={stats.kycPending} />,
      href: "/kyc",
    },
    can(user, "policies:view") && {
      label: t("dashboard.activePolicies"),
      value: <NumberTicker value={stats.activePolicies} />,
      href: "/policies?filter=active",
    },
    can(user, "policies:view") && {
      label: t("dashboard.annualPremium"),
      value: <NumberTicker value={stats.premium} format="money" />,
    },
  ].filter((tile) => !!tile);

  return (
    <>
      <PageHeader
        title={t("dashboard.greeting", { name: user.name.split(" ")[0] })}
        description={
          leadScope !== "none"
            ? t("dashboard.scopeNote", { scope: t(`scope.${leadScope}`) })
            : t("dashboard.roleNote", { role: user.roleName })
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => (
          <Stat key={tile.label} {...tile} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {oppScope !== "none" && (
          <Funnel
            title={t("dashboard.opportunities")}
            href="/opportunities"
            steps={OPPORTUNITY_STATUSES}
            counts={stats.oppsByStatus}
          />
        )}
        {leadScope !== "none" && (
          <Funnel title={t("dashboard.pipeline")} href="/leads" steps={LEAD_STAGES} counts={stats.leadsByStage} />
        )}
        {leadScope !== "none" && <RenewalsCard renewals={stats.renewals} />}
      </div>
    </>
  );
}
