import Link from "next/link";
import { Badge, EmptyRow, Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/db/schema";
import { shortDate, titleCase } from "@/lib/format";
import { listLeads } from "@/lib/queries";
import { can, seesOnlyOwnLeads } from "@/lib/rbac";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  if (!can(user, "leads:view_all") && !can(user, "leads:view_own")) return <Forbidden permission="leads:view_own" />;

  const { status: rawStatus } = await searchParams;
  const status = LEAD_STATUSES.includes(rawStatus as LeadStatus) ? (rawStatus as LeadStatus) : undefined;
  const rows = await listLeads(user, status);

  return (
    <>
      <PageHeader
        title="Leads"
        description={seesOnlyOwnLeads(user) ? "Leads assigned to you" : "All leads across the team"}
        action={
          can(user, "leads:create") && (
            <Link href="/leads/new" className="btn-primary">
              + New lead
            </Link>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...LEAD_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/leads?status=${s}` : "/leads"}
            className={`rounded-full px-3 py-1 text-sm ${
              s === status ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s ? titleCase(s) : "All"}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned to</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <EmptyRow colSpan={6}>No leads here yet.</EmptyRow>}
            {rows.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/leads/${l.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {l.customerName}
                  </Link>
                  <span className="block text-xs text-slate-500">{l.email}</span>
                </td>
                <td className="px-4 py-3">{titleCase(l.product)}</td>
                <td className="px-4 py-3">
                  <Badge value={l.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{l.assigneeName ?? <span className="text-slate-400">Unassigned</span>}</td>
                <td className="px-4 py-3 text-slate-600">{titleCase(l.source)}</td>
                <td className="px-4 py-3 text-slate-500">{shortDate(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
