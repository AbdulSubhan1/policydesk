import Link from "next/link";
import { Forbidden, PageHeader, label } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { LEAD_STAGES, OPPORTUNITY_STATUSES } from "@/lib/db/schema";
import { money, shortDate } from "@/lib/format";
import { dashboardStats } from "@/lib/queries";
import { can, SCOPE_LABEL, scopeOf } from "@/lib/rbac";

const sum = (o: Partial<Record<string, number>>) => Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);

function Funnel({ title, href, steps, counts }: { title: string; href: string; steps: readonly string[]; counts: Partial<Record<string, number>> }) {
  const total = sum(counts);
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="grid gap-2">
        {steps.map((s) => {
          const count = counts[s] ?? 0;
          return (
            <Link key={s} href={`${href}?filter=${s}`} className="group grid grid-cols-[110px_1fr_32px] items-center gap-3 text-sm">
              <span className="text-slate-600 group-hover:text-slate-900">{label(s)}</span>
              <span className="h-2 rounded-full bg-slate-100">
                <span className="block h-2 rounded-full bg-indigo-500" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
              </span>
              <span className="text-right font-medium text-slate-900">{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (!can(user, "dashboard:view")) return <Forbidden permission="dashboard:view" />;

  const stats = await dashboardStats(user);
  const oppScope = scopeOf(user, "opportunities");
  const leadScope = scopeOf(user, "leads");
  const won = stats.leadsByStage.won ?? 0;
  const lost = stats.leadsByStage.lost ?? 0;

  const tiles = [
    oppScope !== "none" && { label: "Opportunities", value: String(sum(stats.oppsByStatus)), href: "/opportunities" },
    leadScope !== "none" && { label: "Open leads", value: String(sum(stats.leadsByStage) - won - lost), href: "/leads" },
    leadScope !== "none" && { label: "Win rate", value: `${won + lost ? Math.round((won / (won + lost)) * 100) : 0}%` },
    can(user, "kyc:review") && { label: "KYC waiting", value: String(stats.kycPending), href: "/kyc" },
    can(user, "policies:view") && { label: "Active policies", value: String(stats.activePolicies), href: "/policies?filter=active" },
    can(user, "policies:view") && { label: "Annual premium", value: money(stats.premium) },
  ].filter((t): t is { label: string; value: string; href?: string } => !!t);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={leadScope !== "none" ? `Showing data ${SCOPE_LABEL[leadScope]}.` : `You are signed in as ${user.roleName}.`}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => {
          const body = (
            <>
              <p className="text-sm text-slate-500">{t.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{t.value}</p>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="card p-5 hover:border-indigo-300">
              {body}
            </Link>
          ) : (
            <div key={t.label} className="card p-5">
              {body}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {oppScope !== "none" && <Funnel title="Opportunities" href="/opportunities" steps={OPPORTUNITY_STATUSES} counts={stats.oppsByStatus} />}
        {leadScope !== "none" && <Funnel title="Lead pipeline" href="/leads" steps={LEAD_STAGES} counts={stats.leadsByStage} />}

        {leadScope !== "none" && (
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Renewals due in 45 days</h2>
              <Link href="/policies?filter=renewal_due" className="text-xs text-indigo-600 hover:underline">
                See all
              </Link>
            </div>
            {stats.renewals.length === 0 ? (
              <p className="text-sm text-slate-500">No renewals coming up.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.renewals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link href={`/leads/${r.leadId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {r.customerName}
                      <span className="block text-xs font-normal text-slate-500">{r.policyNumber}</span>
                    </Link>
                    <span className="text-amber-700">{shortDate(r.endDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
