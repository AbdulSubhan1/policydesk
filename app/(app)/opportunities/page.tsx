import Link from "next/link";
import { Badge, EmptyRow, FilterTabs, Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { OPPORTUNITY_STATUSES, type OpportunityStatus } from "@/lib/db/schema";
import { shortDate } from "@/lib/format";
import { productLabel } from "@/lib/products";
import { listOpportunities } from "@/lib/queries";
import { can, SCOPE_LABEL, scopeOf } from "@/lib/rbac";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser();
  const scope = scopeOf(user, "opportunities");
  if (scope === "none") return <Forbidden permission="opportunities:view_own" />;

  const { filter } = await searchParams;
  const status = OPPORTUNITY_STATUSES.includes(filter as OpportunityStatus) ? (filter as OpportunityStatus) : undefined;
  const rows = await listOpportunities(user, status);

  return (
    <>
      <PageHeader
        title="Opportunities"
        description={`New inquiries ${SCOPE_LABEL[scope]}. Coordinators qualify them and convert them into leads for advisors.`}
        action={
          can(user, "opportunities:create") && (
            <Link href="/opportunities/new" className="btn-primary">
              + New opportunity
            </Link>
          )
        }
      />
      <FilterTabs base="/opportunities" values={OPPORTUNITY_STATUSES} current={status} />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Coordinator</th>
              <th className="px-4 py-3">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <EmptyRow colSpan={6}>No opportunities here.</EmptyRow>}
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/opportunities/${o.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {o.customerName}
                  </Link>
                  <span className="block text-xs text-slate-500">
                    {o.email} · via {o.source}
                  </span>
                </td>
                <td className="px-4 py-3">{productLabel(o.product)}</td>
                <td className="px-4 py-3 text-slate-600">{o.departmentName}</td>
                <td className="px-4 py-3">
                  <Badge value={o.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{o.coordinatorName ?? <span className="text-slate-400">Unassigned</span>}</td>
                <td className="px-4 py-3 text-slate-500">{shortDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
