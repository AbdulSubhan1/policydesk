import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Field, Forbidden, label } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { productLabel } from "@/lib/products";
import { getOpportunity, usersWithPermission } from "@/lib/queries";
import { can, scopeOf } from "@/lib/rbac";
import { assignCoordinator, convertToLead, updateOpportunityStatus } from "../actions";

const EDITABLE_STATUSES = ["new", "contacted", "qualified", "disqualified"] as const;

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (scopeOf(user, "opportunities") === "none") return <Forbidden permission="opportunities:view_own" />;

  const row = await getOpportunity(user, Number((await params).id));
  // Outside the user's scope looks exactly like a missing record
  if (!row) notFound();
  const opp = row.opportunity;
  const converted = opp.status === "converted";

  const [coordinators, advisors] = await Promise.all([
    can(user, "opportunities:assign") ? usersWithPermission(opp.departmentId, "opportunities:convert") : [],
    can(user, "opportunities:convert") ? usersWithPermission(opp.departmentId, "quotes:create") : [],
  ]);

  return (
    <>
      <Link href="/opportunities" className="text-sm text-slate-500 hover:text-slate-900">
        ← All opportunities
      </Link>
      <div className="mt-3 mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{opp.customerName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {productLabel(opp.product)} insurance · {row.departmentName} · received {shortDate(opp.createdAt)} via {opp.source}
          </p>
        </div>
        <Badge value={opp.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Customer</h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{opp.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd>{opp.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Coordinator</dt>
              <dd>{row.coordinatorName ?? "Unassigned"}</dd>
            </div>
            {opp.notes && (
              <div>
                <dt className="text-slate-500">Notes</dt>
                <dd className="whitespace-pre-line">{opp.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="grid content-start gap-6 md:col-span-2">
          {converted && row.leadId && (
            <div className="card flex items-center justify-between gap-4 border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm text-emerald-800">This opportunity was converted into a lead and is now with an advisor.</p>
              <Link href={`/leads/${row.leadId}`} className="btn-primary shrink-0">
                Open lead →
              </Link>
            </div>
          )}

          {!converted && can(user, "opportunities:edit") && (
            <form key={opp.status} action={updateOpportunityStatus} className="card grid gap-3 p-5">
              <input type="hidden" name="id" value={opp.id} />
              <h2 className="text-sm font-semibold text-slate-900">1. Qualify</h2>
              <p className="text-sm text-slate-500">Contact the customer, then mark the opportunity qualified or disqualified.</p>
              <div className="flex gap-2">
                <select name="status" defaultValue={opp.status} className="input">
                  {EDITABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary">Save</button>
              </div>
            </form>
          )}

          {!converted && can(user, "opportunities:assign") && (
            <form key={`c-${opp.coordinatorId}`} action={assignCoordinator} className="card grid gap-3 p-5">
              <input type="hidden" name="id" value={opp.id} />
              <h2 className="text-sm font-semibold text-slate-900">Coordinator</h2>
              <div className="flex gap-2">
                <select name="coordinatorId" defaultValue={opp.coordinatorId ?? ""} className="input">
                  <option value="">Unassigned</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role})
                    </option>
                  ))}
                </select>
                <button className="btn-secondary">Assign</button>
              </div>
            </form>
          )}

          {!converted && can(user, "opportunities:convert") && (
            <form action={convertToLead} className="card grid gap-3 p-5">
              <input type="hidden" name="id" value={opp.id} />
              <h2 className="text-sm font-semibold text-slate-900">2. Convert to lead</h2>
              {opp.status !== "qualified" ? (
                <p className="text-sm text-slate-500">Mark the opportunity as qualified first.</p>
              ) : (
                <>
                  <p className="text-sm text-slate-500">
                    Creates a lead for an advisor in {row.departmentName}. Quotes, KYC, documents and the policy happen on the lead.
                  </p>
                  <Field label="Advisor">
                    <div className="flex gap-2">
                      <select name="advisorId" required className="input">
                        {advisors.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.role})
                          </option>
                        ))}
                      </select>
                      <button className="btn-primary shrink-0">Convert</button>
                    </div>
                  </Field>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
