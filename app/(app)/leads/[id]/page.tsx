import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, EmptyRow, Forbidden } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/db/schema";
import { money, shortDate, titleCase } from "@/lib/format";
import { getLead } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { assignLead, issuePolicy, setQuoteStatus, updateLeadStatus } from "../actions";
import { QuoteForm } from "./quote-form";

const { quotes, policies, users, roles, rolePermissions } = schema;

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!can(user, "leads:view_all") && !can(user, "leads:view_own")) return <Forbidden permission="leads:view_own" />;

  const lead = await getLead(user, Number((await params).id));
  // An agent opening someone else's lead gets a 404, not a hint that it exists
  if (!lead) notFound();

  const [leadQuotes, leadPolicies, assignee] = await Promise.all([
    db.select().from(quotes).where(eq(quotes.leadId, lead.id)).orderBy(desc(quotes.createdAt)),
    db.select().from(policies).where(eq(policies.leadId, lead.id)),
    lead.assignedTo
      ? db.select({ name: users.name }).from(users).where(eq(users.id, lead.assignedTo)).then((r) => r[0])
      : null,
  ]);

  // Only people whose role can work leads are offered as assignees
  const assignees = can(user, "leads:assign")
    ? await db
        .selectDistinct({ id: users.id, name: users.name, role: roles.name })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
        .where(eq(rolePermissions.permission, "leads:edit"))
        .orderBy(users.name)
    : [];

  const issuedQuoteIds = new Set(leadPolicies.map((p) => p.quoteId));

  return (
    <>
      <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-900">
        ← All leads
      </Link>

      <div className="mt-3 mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{lead.customerName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {titleCase(lead.product)} insurance · from {lead.source} · created {shortDate(lead.createdAt)}
          </p>
        </div>
        <Badge value={lead.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-5 md:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Customer</h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-900">{lead.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="text-slate-900">{lead.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Assigned to</dt>
              <dd className="text-slate-900">{assignee?.name ?? "Unassigned"}</dd>
            </div>
            {lead.notes && (
              <div>
                <dt className="text-slate-500">Notes</dt>
                <dd className="whitespace-pre-line text-slate-900">{lead.notes}</dd>
              </div>
            )}
          </dl>

          {can(user, "leads:edit") && (
            // key resets the uncontrolled select when an action elsewhere changes the status
            <form key={lead.status} action={updateLeadStatus} className="mt-5 grid gap-2 border-t border-slate-100 pt-5">
              <input type="hidden" name="leadId" value={lead.id} />
              <label className="text-sm font-medium text-slate-700">Status</label>
              <div className="flex gap-2">
                <select name="status" defaultValue={lead.status} className="input">
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {titleCase(s)}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary">Save</button>
              </div>
            </form>
          )}

          {can(user, "leads:assign") && (
            <form action={assignLead} className="mt-4 grid gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <label className="text-sm font-medium text-slate-700">Assign to</label>
              <div className="flex gap-2">
                <select name="assignedTo" defaultValue={lead.assignedTo ?? ""} className="input">
                  <option value="">Unassigned</option>
                  {assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role})
                    </option>
                  ))}
                </select>
                <button className="btn-secondary">Assign</button>
              </div>
            </form>
          )}
        </div>

        <div className="grid content-start gap-6 md:col-span-2">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-5">
              <h2 className="text-sm font-semibold text-slate-900">Quotes</h2>
              <span className="text-xs text-slate-500">{leadQuotes.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2">Insurer</th>
                    <th className="px-4 py-2">Coverage</th>
                    <th className="px-4 py-2">Premium</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leadQuotes.length === 0 && <EmptyRow colSpan={5}>No quotes yet.</EmptyRow>}
                  {leadQuotes.map((q) => (
                    <tr key={q.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{q.insurer}</td>
                      <td className="px-4 py-3">{q.coverage}</td>
                      <td className="px-4 py-3">{money(q.premium)}</td>
                      <td className="px-4 py-3">
                        <Badge value={q.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {q.status === "sent" && can(user, "quotes:approve") && (
                            <>
                              <form action={setQuoteStatus}>
                                <input type="hidden" name="quoteId" value={q.id} />
                                <button name="status" value="accepted" className="btn-secondary">
                                  Accept
                                </button>
                              </form>
                              <form action={setQuoteStatus}>
                                <input type="hidden" name="quoteId" value={q.id} />
                                <button name="status" value="rejected" className="btn-danger">
                                  Reject
                                </button>
                              </form>
                            </>
                          )}
                          {q.status === "accepted" && !issuedQuoteIds.has(q.id) && can(user, "policies:issue") && (
                            <form action={issuePolicy}>
                              <input type="hidden" name="quoteId" value={q.id} />
                              <button className="btn-primary !py-1.5">Issue policy</button>
                            </form>
                          )}
                          {issuedQuoteIds.has(q.id) && <span className="text-xs text-emerald-700">Policy issued</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {can(user, "quotes:create") && <QuoteForm leadId={lead.id} />}
          </div>

          {leadPolicies.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Policies</h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {leadPolicies.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <span>
                      <span className="font-medium text-slate-900">{p.policyNumber}</span>
                      <span className="block text-xs text-slate-500">
                        {shortDate(p.startDate)} – {shortDate(p.endDate)} · {money(p.premium)}
                      </span>
                    </span>
                    <Badge value={p.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
