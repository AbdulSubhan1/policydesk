import Link from "next/link";
import { Badge, EmptyRow, FilterTabs, Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";
import { productLabel } from "@/lib/products";
import { listPolicies } from "@/lib/queries";
import { can, SCOPE_LABEL, scopeOf } from "@/lib/rbac";
import { startRenewal } from "./actions";

const FILTERS = ["booked", "active", "cancelled", "unpaid", "renewal_due"] as const;
const DAY = 86_400_000;

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser();
  if (!can(user, "policies:view")) return <Forbidden permission="policies:view" />;

  const { filter } = await searchParams;
  const all = await listPolicies(user);
  const renewalDue = (p: (typeof all)[number]) =>
    p.status === "active" && !p.renewedByLeadId && new Date(p.endDate).getTime() - Date.now() < 45 * DAY;
  const rows = all.filter((p) => {
    if (filter === "unpaid") return p.paymentStatus === "pending" || p.paymentStatus === "failed";
    if (filter === "renewal_due") return renewalDue(p);
    if (filter && FILTERS.includes(filter as never)) return p.status === filter;
    return true;
  });
  const canRenew = can(user, "policies:renew");

  return (
    <>
      <PageHeader title="Policies & payments" description={`Booked policies become active once payment is recorded. Showing policies ${SCOPE_LABEL[scopeOf(user, "leads")]}.`} />
      <FilterTabs base="/policies" values={FILTERS} current={filter} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Policy</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Insurer</th>
              <th className="px-4 py-3">Premium</th>
              <th className="px-4 py-3">Ends</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <EmptyRow colSpan={8}>No policies here.</EmptyRow>}
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.policyNumber}</td>
                <td className="px-4 py-3">
                  <Link href={`/leads/${p.leadId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {p.customerName}
                  </Link>
                  <span className="block text-xs text-slate-500">
                    {productLabel(p.product)} · {p.advisorName ?? "no advisor"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.insurer}
                  <span className="block text-xs text-slate-500">{p.coverage}</span>
                </td>
                <td className="px-4 py-3">{money(p.premium)}</td>
                <td className={`px-4 py-3 ${renewalDue(p) ? "font-medium text-amber-700" : "text-slate-600"}`}>{shortDate(p.endDate)}</td>
                <td className="px-4 py-3">
                  <Badge value={p.status} />
                </td>
                <td className="px-4 py-3">
                  <Badge value={p.paymentStatus} />
                </td>
                <td className="px-4 py-3 text-right">
                  {p.renewedByLeadId ? (
                    <Link href={`/leads/${p.renewedByLeadId}`} className="text-xs text-violet-700 hover:underline">
                      Renewal →
                    </Link>
                  ) : (
                    canRenew &&
                    renewalDue(p) && (
                      <form action={startRenewal}>
                        <input type="hidden" name="policyId" value={p.id} />
                        <button className="btn-secondary">Renew</button>
                      </form>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
