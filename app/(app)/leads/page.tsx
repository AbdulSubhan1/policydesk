import Link from "next/link";
import { Badge, EmptyRow, FilterTabs, Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { LEAD_STAGES, type LeadStage } from "@/lib/db/schema";
import { shortDate } from "@/lib/format";
import { productLabel } from "@/lib/products";
import { listLeads } from "@/lib/queries";
import { SCOPE_LABEL, scopeOf } from "@/lib/rbac";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser();
  const scope = scopeOf(user, "leads");
  if (scope === "none") return <Forbidden permission="leads:view_own" />;

  const { filter } = await searchParams;
  const stage = LEAD_STAGES.includes(filter as LeadStage) ? (filter as LeadStage) : undefined;
  const rows = await listLeads(user, stage);

  return (
    <>
      <PageHeader title="Leads" description={`Qualified customers being worked by advisors, ${SCOPE_LABEL[scope]}.`} />
      <FilterTabs base="/leads" values={LEAD_STAGES} current={stage} />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">KYC</th>
              <th className="px-4 py-3">Advisor</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <EmptyRow colSpan={6}>No leads here.</EmptyRow>}
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/leads/${l.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {l.customerName}
                  </Link>
                  <span className="block text-xs text-slate-500">
                    #{l.id} · {l.departmentName}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {productLabel(l.product)}
                  {l.type === "renewal" && (
                    <span className="ml-2">
                      <Badge value="renewal" />
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge value={l.stage} />
                </td>
                <td className="px-4 py-3">{l.kycStatus && <Badge value={l.kycStatus} />}</td>
                <td className="px-4 py-3 text-slate-600">{l.advisorName ?? <span className="text-slate-400">Unassigned</span>}</td>
                <td className="px-4 py-3 text-slate-500">{shortDate(l.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
