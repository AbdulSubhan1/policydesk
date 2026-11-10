import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, EmptyRow, Field, Forbidden, label } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/db/schema";
import { documentsForProduct } from "@/lib/documents";
import { money, shortDate } from "@/lib/format";
import { productLabel } from "@/lib/products";
import { getLead, usersWithPermission } from "@/lib/queries";
import { can, scopeOf } from "@/lib/rbac";
import { cancelPolicy, recordPayment, startRenewal } from "../../policies/actions";
import { deleteDocument, issuePolicy, reassignAdvisor, setQuoteStatus, updateLeadStage } from "../actions";
import { KycForm, QuoteForm, UploadForm } from "./forms";

const { quotes, kycRecords, documents, policies, auditLogs, users, plans, insurers } = schema;
const reviewer = alias(users, "reviewer");

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (scopeOf(user, "leads") === "none") return <Forbidden permission="leads:view_own" />;

  const row = await getLead(user, Number((await params).id));
  // Outside the user's scope looks exactly like a missing record
  if (!row) notFound();
  const { lead, opportunity: opp } = row;

  const [leadQuotes, [kyc], docs, docConfig, productPlans, [policy], [previous], timeline, advisors] = await Promise.all([
    db.select().from(quotes).where(eq(quotes.leadId, lead.id)).orderBy(desc(quotes.createdAt)),
    db
      .select({ kyc: kycRecords, reviewerName: reviewer.name })
      .from(kycRecords)
      .leftJoin(reviewer, eq(kycRecords.reviewedBy, reviewer.id))
      .where(eq(kycRecords.leadId, lead.id)),
    db
      .select({
        id: documents.id,
        documentTypeId: documents.documentTypeId,
        fileName: documents.fileName,
        size: documents.size,
        createdAt: documents.createdAt,
        uploadedBy: users.name,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .where(eq(documents.leadId, lead.id))
      .orderBy(desc(documents.createdAt)),
    documentsForProduct(opp.product),
    can(user, "quotes:create")
      ? db
          .select({
            id: plans.id,
            name: plans.name,
            insurer: insurers.name,
            cover: plans.cover,
            basePremium: plans.basePremium,
            excess: plans.excess,
            benefits: plans.benefits,
          })
          .from(plans)
          .innerJoin(insurers, eq(plans.insurerId, insurers.id))
          .where(and(eq(plans.product, opp.product), eq(plans.active, true), eq(insurers.active, true)))
          .orderBy(insurers.name, plans.basePremium)
      : [],
    db.select().from(policies).where(eq(policies.leadId, lead.id)),
    lead.previousPolicyId ? db.select().from(policies).where(eq(policies.id, lead.previousPolicyId)) : [],
    db
      .select({ id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity, details: auditLogs.details, createdAt: auditLogs.createdAt, userName: users.name })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.leadId, lead.id))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)),
    can(user, "leads:assign") ? usersWithPermission(lead.departmentId, "quotes:create") : [],
  ]);

  const docTypeName = new Map(docConfig.map((d) => [d.id, d.name]));
  const uploadedTypes = new Set(docs.map((d) => d.documentTypeId));
  const missingDocs = docConfig.filter((d) => d.required && !uploadedTypes.has(d.id));
  const acceptedQuote = leadQuotes.find((q) => q.status === "accepted");
  const kycApproved = kyc?.kyc.status === "approved";
  const closed = lead.stage === "won" || lead.stage === "lost";

  const checklist = [
    { label: "Quote accepted", done: !!acceptedQuote },
    { label: "KYC approved", done: kycApproved },
    { label: `Required documents (${docConfig.filter((d) => d.required).length - missingDocs.length}/${docConfig.filter((d) => d.required).length})`, done: missingDocs.length === 0 },
    { label: "Policy booked", done: !!policy },
    { label: "Payment received", done: policy?.paymentStatus === "paid" },
  ];

  return (
    <>
      <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-900">
        ← All leads
      </Link>

      <div className="mt-3 mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{opp.customerName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lead #{lead.id} · {productLabel(opp.product)} insurance · {row.departmentName} · advisor {row.advisorName ?? "unassigned"}
          </p>
          {previous && (
            <p className="mt-1 text-sm text-violet-700">Renewal of {previous.policyNumber} (ends {shortDate(previous.endDate)})</p>
          )}
        </div>
        <div className="flex gap-2">
          <Badge value={lead.type} />
          <Badge value={lead.stage} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-5">
        {checklist.map((c) => (
          <div key={c.label} className={`rounded-lg border px-3 py-2 text-xs ${c.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}>
            {c.done ? "✓" : "○"} {c.label}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: customer and controls */}
        <div className="grid content-start gap-6">
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Customer</h2>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="break-all">{opp.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd>{opp.phone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Opportunity</dt>
                <dd>
                  {scopeOf(user, "opportunities") !== "none" ? (
                    <Link href={`/opportunities/${opp.id}`} className="text-indigo-600 hover:underline">
                      #{opp.id} via {opp.source}
                    </Link>
                  ) : (
                    `#${opp.id} via ${opp.source}`
                  )}
                </dd>
              </div>
            </dl>

            {can(user, "leads:edit") && !closed && (
              <form key={lead.stage} action={updateLeadStage} className="mt-5 grid gap-2 border-t border-slate-100 pt-5">
                <input type="hidden" name="leadId" value={lead.id} />
                <Field label="Stage">
                  <div className="flex gap-2">
                    <select name="stage" defaultValue={lead.stage} className="input">
                      {(["needs_analysis", "quoted", "kyc", "lost"] as const).map((s) => (
                        <option key={s} value={s}>
                          {label(s)}
                        </option>
                      ))}
                    </select>
                    <button className="btn-secondary">Save</button>
                  </div>
                </Field>
              </form>
            )}

            {can(user, "leads:assign") && !closed && (
              <form key={`a-${lead.advisorId}`} action={reassignAdvisor} className="mt-4 grid gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <Field label="Advisor">
                  <div className="flex gap-2">
                    <select name="advisorId" defaultValue={lead.advisorId ?? ""} className="input">
                      {advisors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.role})
                        </option>
                      ))}
                    </select>
                    <button className="btn-secondary">Assign</button>
                  </div>
                </Field>
              </form>
            )}
          </div>

          {/* Activity timeline: this lead's own audit log */}
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Activity</h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing yet.</p>
            ) : (
              <ol className="relative grid gap-4 border-l border-slate-200 pl-4">
                {timeline.map((t) => (
                  <li key={t.id} className="relative text-sm">
                    <span className="absolute top-1.5 -left-[21px] h-2 w-2 rounded-full bg-indigo-400" />
                    <p className="text-slate-900">
                      <span className="font-medium">{t.userName ?? "System"}</span> · {label(t.entity)} {t.action.replaceAll("_", " ")}
                    </p>
                    {t.details && <p className="text-xs text-slate-500">{t.details}</p>}
                    <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Right column: the work on the lead */}
        <div className="grid min-w-0 content-start gap-6 lg:col-span-2">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between p-5">
              <h2 className="text-sm font-semibold text-slate-900">Quotes</h2>
              <span className="text-xs text-slate-500">{leadQuotes.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-2">Insurer & plan</th>
                    <th className="px-4 py-2">Premium</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leadQuotes.length === 0 && <EmptyRow colSpan={4}>No quotes yet.</EmptyRow>}
                  {leadQuotes.map((q) => (
                    <tr key={q.id}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{q.insurer}</span>
                        <span className="block text-xs text-slate-500">{q.coverage}</span>
                      </td>
                      <td className="px-4 py-3">{money(q.premium)}</td>
                      <td className="px-4 py-3">
                        <Badge value={q.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {q.status === "sent" && !closed && can(user, "quotes:approve") && (
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {can(user, "quotes:create") && !closed && <QuoteForm leadId={lead.id} plans={productPlans} />}
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">KYC / AML</h2>
              {kyc && <Badge value={kyc.kyc.status} prefix="KYC " />}
            </div>
            {kyc && kyc.kyc.status !== "pending" && (
              <div className="mb-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">ID</p>
                  <p>{kyc.kyc.idNumber}</p>
                  <p className="text-xs text-slate-500">expires {kyc.kyc.idExpiry && shortDate(kyc.kyc.idExpiry)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Nationality / occupation</p>
                  <p>
                    {kyc.kyc.nationality} · {kyc.kyc.occupation}
                  </p>
                  <p className="text-xs text-slate-500">funds: {kyc.kyc.sourceOfFunds}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Screening</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {kyc.kyc.riskRating && <Badge value={kyc.kyc.riskRating} prefix="Risk: " />}
                    {kyc.kyc.isPep && <Badge value="high" text="PEP" />}
                    {kyc.kyc.watchlistMatch && <Badge value="rejected" text="Watchlist match" />}
                    {kyc.kyc.eddRequired && <Badge value="pending" text="EDD required" />}
                  </div>
                </div>
                {kyc.kyc.riskReasons.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-slate-600 md:col-span-3">
                    {kyc.kyc.riskReasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
                {kyc.kyc.reviewNote && (
                  <p className="text-xs text-slate-600 md:col-span-3">
                    Compliance{kyc.reviewerName ? ` (${kyc.reviewerName})` : ""}: “{kyc.kyc.reviewNote}”
                  </p>
                )}
              </div>
            )}
            {kyc?.kyc.status === "submitted" && <p className="text-sm text-slate-500">Waiting for a compliance officer to review.</p>}
            {kyc && (kyc.kyc.status === "pending" || kyc.kyc.status === "rejected") && !closed && can(user, "kyc:submit") && (
              <KycForm
                leadId={lead.id}
                defaults={{
                  idNumber: kyc.kyc.idNumber,
                  nationality: kyc.kyc.nationality,
                  dateOfBirth: kyc.kyc.dateOfBirth,
                  idExpiry: kyc.kyc.idExpiry,
                  occupation: kyc.kyc.occupation,
                  sourceOfFunds: kyc.kyc.sourceOfFunds,
                }}
              />
            )}
            {kyc?.kyc.status === "pending" && !can(user, "kyc:submit") && <p className="text-sm text-slate-500">The advisor has not collected KYC yet.</p>}
          </section>

          <section className="card overflow-hidden">
            <div className="p-5">
              <h2 className="text-sm font-semibold text-slate-900">Documents</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {docConfig
                  .filter((d) => d.name !== "Other")
                  .map((d) => (
                    <span
                      key={d.id}
                      title={d.description}
                      className={`rounded-full px-2.5 py-1 text-xs ${uploadedTypes.has(d.id) ? "bg-emerald-50 text-emerald-700" : d.required ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                    >
                      {uploadedTypes.has(d.id) ? "✓" : "○"} {d.name}
                      {d.required ? " *" : ""}
                    </span>
                  ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">* required before a policy can be issued. Set per product under Document settings.</p>
            </div>
            {docs.length > 0 && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">{d.fileName}</span>
                      <span className="block text-xs text-slate-500">
                        {docTypeName.get(d.documentTypeId) ?? "Document"} · {Math.ceil(d.size / 1024)} KB · {d.uploadedBy} · {shortDate(d.createdAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-2">
                      {can(user, "documents:download") && (
                        <a href={`/leads/${lead.id}/documents/${d.id}`} target="_blank" rel="noreferrer" className="btn-secondary">
                          View
                        </a>
                      )}
                      {can(user, "documents:upload") && !policy && (
                        <form action={deleteDocument}>
                          <input type="hidden" name="documentId" value={d.id} />
                          <button className="btn-danger">Delete</button>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {can(user, "documents:upload") && !closed && docConfig.length > 0 && <UploadForm leadId={lead.id} types={docConfig} />}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Policy & payment</h2>
            {!policy && (
              <>
                {acceptedQuote && kycApproved && missingDocs.length === 0 ? (
                  can(user, "policies:issue") ? (
                    <form action={issuePolicy} className="flex flex-wrap items-center justify-between gap-3">
                      <input type="hidden" name="quoteId" value={acceptedQuote.id} />
                      <p className="text-sm text-slate-600">
                        Ready to book {acceptedQuote.insurer} at {money(acceptedQuote.premium)}.
                      </p>
                      <button className="btn-primary">Book policy</button>
                    </form>
                  ) : (
                    <p className="text-sm text-slate-500">Ready to be booked by the advisor.</p>
                  )
                ) : (
                  <ul className="grid gap-1 text-sm text-slate-500">
                    {!acceptedQuote && <li>○ Customer has not accepted a quote yet</li>}
                    {!kycApproved && <li>○ KYC is not approved yet</li>}
                    {missingDocs.length > 0 && <li>○ Missing required documents: {missingDocs.map((d) => d.name).join(", ")}</li>}
                  </ul>
                )}
              </>
            )}

            {policy && (
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-medium text-slate-900">{policy.policyNumber}</p>
                    <p className="text-xs text-slate-500">
                      {shortDate(policy.startDate)} – {shortDate(policy.endDate)} · {money(policy.premium)}
                      {policy.paymentReference && ` · ${policy.paymentReference}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge value={policy.status} />
                    <Badge value={policy.paymentStatus} prefix="Payment: " />
                  </div>
                </div>

                {can(user, "payments:record") && policy.status !== "cancelled" && policy.paymentStatus !== "refunded" && (
                  <form className="grid gap-2 rounded-lg bg-slate-50 p-3 md:grid-cols-4 md:items-end" action={recordPayment}>
                    <input type="hidden" name="policyId" value={policy.id} />
                    <Field label="Payment">
                      <select name="paymentStatus" className="input">
                        {policy.paymentStatus !== "paid" && <option value="paid">Paid</option>}
                        {policy.paymentStatus !== "paid" && <option value="failed">Failed</option>}
                        {policy.paymentStatus === "paid" && <option value="refunded">Refunded</option>}
                      </select>
                    </Field>
                    <Field label="Method">
                      <select name="paymentMethod" defaultValue={policy.paymentMethod ?? "card"} className="input">
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {label(m)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Reference">
                      <input name="paymentReference" defaultValue={policy.paymentReference ?? ""} className="input" />
                    </Field>
                    <button className="btn-secondary">Record</button>
                  </form>
                )}

                <div className="flex flex-wrap gap-2">
                  {policy.renewedByLeadId ? (
                    <Link href={`/leads/${policy.renewedByLeadId}`} className="btn-secondary">
                      Open renewal lead →
                    </Link>
                  ) : (
                    policy.status === "active" &&
                    can(user, "policies:renew") && (
                      <form action={startRenewal}>
                        <input type="hidden" name="policyId" value={policy.id} />
                        <button className="btn-primary">Start renewal</button>
                      </form>
                    )
                  )}
                  {policy.status !== "cancelled" && can(user, "policies:cancel") && (
                    <form action={cancelPolicy}>
                      <input type="hidden" name="policyId" value={policy.id} />
                      <button className="btn-danger">Cancel policy</button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
