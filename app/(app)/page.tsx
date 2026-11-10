import Link from "next/link";
import { Badge, Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { LEAD_STATUSES } from "@/lib/db/schema";
import { money, shortDate, titleCase } from "@/lib/format";
import { dashboardStats } from "@/lib/queries";
import { can, seesOnlyOwnLeads } from "@/lib/rbac";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!can(user, "dashboard:view")) return <Forbidden permission="dashboard:view" />;

  const stats = await dashboardStats(user);
  const totalLeads = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
  const won = stats.byStatus.won ?? 0;
  const lost = stats.byStatus.lost ?? 0;
  const conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const tiles = [
    { label: seesOnlyOwnLeads(user) ? "My leads" : "Total leads", value: String(totalLeads) },
    { label: "Win rate", value: `${conversion}%` },
    { label: "Active policies", value: String(stats.activePolicies) },
    { label: "Annual premium", value: money(stats.premium) },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={seesOnlyOwnLeads(user) ? "Showing only the leads assigned to you." : "Showing the whole team's pipeline."}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <p className="text-sm text-slate-500">{t.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Pipeline</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {LEAD_STATUSES.map((s) => {
            const count = stats.byStatus[s] ?? 0;
            const pct = totalLeads ? (count / totalLeads) * 100 : 0;
            return (
              <Link key={s} href={`/leads?status=${s}`} className="rounded-lg border border-slate-200 p-3 hover:border-indigo-300">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{titleCase(s)}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Renewals due in 30 days</h2>
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
                  <span className="text-slate-500">{shortDate(r.endDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Latest leads</h2>
          <ul className="divide-y divide-slate-100">
            {stats.recent.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/leads/${l.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                  {l.customerName}
                  <span className="block text-xs font-normal text-slate-500">
                    {titleCase(l.product)} · {l.assigneeName ?? "Unassigned"}
                  </span>
                </Link>
                <Badge value={l.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
