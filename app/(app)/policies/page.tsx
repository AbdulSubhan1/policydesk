import Link from "next/link";
import { Badge, EmptyRow, Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { money, shortDate, titleCase } from "@/lib/format";
import { listPolicies } from "@/lib/queries";
import { can, seesOnlyOwnLeads } from "@/lib/rbac";
import { cancelPolicy } from "./actions";

export default async function PoliciesPage() {
  const user = await requireUser();
  if (!can(user, "policies:view")) return <Forbidden permission="policies:view" />;

  const rows = await listPolicies(user);
  const canCancel = can(user, "policies:cancel");

  return (
    <>
      <PageHeader
        title="Policies"
        description={seesOnlyOwnLeads(user) ? "Policies for your customers" : "Every policy issued by the team"}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Policy</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Insurer</th>
              <th className="px-4 py-3">Premium</th>
              <th className="px-4 py-3">Ends</th>
              <th className="px-4 py-3">Status</th>
              {canCancel && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <EmptyRow colSpan={7}>No policies yet.</EmptyRow>}
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.policyNumber}</td>
                <td className="px-4 py-3">
                  <Link href={`/leads/${p.leadId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {p.customerName}
                  </Link>
                  <span className="block text-xs text-slate-500">{titleCase(p.product)}</span>
                </td>
                <td className="px-4 py-3">{p.insurer}</td>
                <td className="px-4 py-3">{money(p.premium)}</td>
                <td className="px-4 py-3 text-slate-600">{shortDate(p.endDate)}</td>
                <td className="px-4 py-3">
                  <Badge value={p.status} />
                </td>
                {canCancel && (
                  <td className="px-4 py-3 text-right">
                    {p.status === "active" && (
                      <form action={cancelPolicy}>
                        <input type="hidden" name="policyId" value={p.id} />
                        <button className="btn-danger">Cancel</button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
