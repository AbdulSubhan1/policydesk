import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ScreeningResult } from "@/components/leads/screening-result";
import {
  Badge,
  Button,
  Card,
  CardBody,
  DetailList,
  EmptyState,
  Forbidden,
  Hidden,
  Input,
  PageHeader,
  PillNav,
} from "@/components/ui";
import { shortDate } from "@/lib/format";
import { can } from "@/lib/rbac";
import { reviewKyc } from "@/server/actions/kyc";
import { requireUser } from "@/server/auth";
import { kycQueue } from "@/server/queries/kyc";

export default async function KycReviewPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser();
  if (!can(user, "kyc:review")) return <Forbidden permission="kyc:review" />;

  const history = (await searchParams).filter === "history";
  const [rows, t] = await Promise.all([
    kycQueue(history ? ["approved", "rejected"] : ["submitted"]),
    getTranslations(),
  ]);

  return (
    <>
      <PageHeader title={t("kycReview.title")} description={t("kycReview.description")} />
      <PillNav
        label={t("kycReview.title")}
        items={[
          { href: "/kyc", label: t("kycReview.waiting"), active: !history },
          { href: "/kyc?filter=history", label: t("kycReview.reviewed"), active: history },
        ]}
      />

      {rows.length === 0 && (
        <Card>
          <EmptyState title={t("kycReview.empty")} />
        </Card>
      )}

      <div className="grid gap-4">
        {rows.map(({ kyc, ...r }) => (
          <Card key={kyc.id} className={kyc.eddRequired ? "border-risk/30" : undefined}>
            <CardBody className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/leads/${r.leadId}?tab=kyc`} className="font-semibold text-ink hover:text-brand">
                    {r.customerName}
                  </Link>
                  <p className="text-xs text-muted">
                    {t("kycReview.submittedBy", {
                      product: t(`products.${r.product}`),
                      department: t(`departments.${r.departmentKey}`),
                      advisor: r.advisorName ?? "—",
                      date: kyc.submittedAt ? shortDate(kyc.submittedAt) : "—",
                    })}
                  </p>
                </div>
                {history && <Badge status={kyc.status} />}
              </div>
              <DetailList
                columns={3}
                items={[
                  { label: t("lead.kyc.idNumber"), value: kyc.idNumber },
                  { label: t("lead.kyc.idExpiry"), value: kyc.idExpiry && shortDate(kyc.idExpiry) },
                  { label: t("lead.kyc.nationality"), value: kyc.nationality },
                  { label: t("lead.kyc.occupation"), value: kyc.occupation },
                  { label: t("lead.kyc.sourceOfFunds"), value: kyc.sourceOfFunds && t(`funds.${kyc.sourceOfFunds}`) },
                ]}
              />
              <ScreeningResult kyc={kyc} />
              {history ? (
                kyc.reviewNote && (
                  <p className="text-sm text-ink-soft">{t("kycReview.noteShown", { note: kyc.reviewNote })}</p>
                )
              ) : (
                <form action={reviewKyc} className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
                  <Hidden name="kycId" value={kyc.id} />
                  <Input
                    name="note"
                    required={kyc.eddRequired}
                    aria-label={t("kycReview.note")}
                    placeholder={kyc.eddRequired ? t("kycReview.noteRequired") : t("kycReview.notePlaceholder")}
                  />
                  <span className="flex gap-2">
                    <Button variant="primary" name="decision" value="approved">
                      {t("kycReview.approve")}
                    </Button>
                    <Button variant="danger" name="decision" value="rejected">
                      {t("kycReview.reject")}
                    </Button>
                  </span>
                </form>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted">{t("kycReview.simulated")}</p>
    </>
  );
}
