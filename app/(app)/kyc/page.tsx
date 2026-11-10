import Link from "next/link";
import { Badge, Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";
import { productLabel } from "@/lib/products";
import { kycQueue } from "@/lib/queries";
import { can } from "@/lib/rbac";
import { reviewKyc } from "./actions";

export default async function KycPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser();
  if (!can(user, "kyc:review")) return <Forbidden permission="kyc:review" />;

  const { filter } = await searchParams;
  const showHistory = filter === "history";
  const rows = await kycQueue(showHistory ? ["approved", "rejected"] : ["submitted"]);

  return (
    <>
      <PageHeader
        title="KYC / AML review"
        description="Advisors submit KYC; screening flags PEPs, watchlist matches and high-risk countries. Approve before any policy can be booked."
      />
      <div className="mb-4 flex gap-2">
        <Link href="/kyc" className={`rounded-full px-3 py-1 text-sm ${!showHistory ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
          Waiting for review
        </Link>
        <Link href="/kyc?filter=history" className={`rounded-full px-3 py-1 text-sm ${showHistory ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
          Reviewed
        </Link>
      </div>

      {rows.length === 0 && <p className="card p-8 text-center text-sm text-slate-500">Nothing here. 🎉</p>}

      <div className="grid gap-4">
        {rows.map(({ kyc, ...r }) => (
          <article key={kyc.id} className={`card p-5 ${kyc.eddRequired ? "border-red-200" : ""}`}>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <Link href={`/leads/${r.leadId}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                  {r.customerName}
                </Link>
                <p className="text-xs text-slate-500">
                  {productLabel(r.product)} · {r.departmentName} · advisor {r.advisorName ?? "—"} · submitted {kyc.submittedAt && shortDate(kyc.submittedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {kyc.riskRating && <Badge value={kyc.riskRating} prefix="Risk: " />}
                {kyc.isPep && <Badge value="high" text="PEP" />}
                {kyc.watchlistMatch && <Badge value="rejected" text="Watchlist match" />}
                {kyc.eddRequired && <Badge value="pending" text="EDD required" />}
                {showHistory && <Badge value={kyc.status} />}
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">ID number</dt>
                <dd>{kyc.idNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">ID expiry</dt>
                <dd>{kyc.idExpiry && shortDate(kyc.idExpiry)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Nationality · occupation</dt>
                <dd>
                  {kyc.nationality} · {kyc.occupation}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Source of funds</dt>
                <dd className="capitalize">{kyc.sourceOfFunds}</dd>
              </div>
            </dl>
            {kyc.riskReasons.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-xs text-slate-600">
                {kyc.riskReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}

            {showHistory ? (
              kyc.reviewNote && <p className="mt-3 text-xs text-slate-600">Note: “{kyc.reviewNote}”</p>
            ) : (
              <form action={reviewKyc} className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 md:flex-row">
                <input type="hidden" name="kycId" value={kyc.id} />
                <input
                  name="note"
                  required={kyc.eddRequired}
                  placeholder={kyc.eddRequired ? "Required: enhanced due diligence notes" : "Optional note (required to reject)"}
                  className="input"
                />
                <div className="flex gap-2">
                  <button name="decision" value="approved" className="btn-primary">
                    Approve
                  </button>
                  <button name="decision" value="rejected" className="btn-danger">
                    Reject
                  </button>
                </div>
              </form>
            )}
          </article>
        ))}
      </div>
      <p className="mt-6 text-xs text-slate-400">Premiums over {money(3000)} raise the risk score. Screening is simulated for the demo.</p>
    </>
  );
}
