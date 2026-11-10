import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DetailList,
  Field,
  Forbidden,
  Hidden,
  InlineForm,
  PageHeader,
  Autocomplete,
} from "@/components/ui";
import { EDITABLE_OPPORTUNITY_STATUSES } from "@/constants/statuses";
import { shortDate } from "@/lib/format";
import { keyedOptions } from "@/lib/options";
import { can, scopeOf } from "@/lib/rbac";
import { assignCoordinator, convertToLead, updateOpportunityStatus } from "@/server/actions/opportunities";
import { requireUser } from "@/server/auth";
import { getOpportunity } from "@/server/queries/opportunities";
import { usersWithPermission } from "@/server/queries/users";

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (scopeOf(user, "opportunities") === "none") return <Forbidden permission="opportunities:view_own" />;

  const row = await getOpportunity(user, Number((await params).id));
  // Outside the user's scope looks exactly like a missing record
  if (!row) notFound();
  const opp = row.opportunity;
  const open = opp.status !== "converted";

  const [coordinators, advisors, t] = await Promise.all([
    open && can(user, "opportunities:assign") ? usersWithPermission(opp.departmentId, "opportunities:convert") : [],
    open && can(user, "opportunities:convert") ? usersWithPermission(opp.departmentId, "quotes:create") : [],
    getTranslations(),
  ]);
  const department = t(`departments.${row.departmentKey}`);

  return (
    <>
      <PageHeader
        back={{ href: "/opportunities", label: t("opportunities.title") }}
        title={opp.customerName}
        description={t("opportunities.summary", {
          product: t(`products.${opp.product}`),
          department,
          date: shortDate(opp.createdAt),
          source: t(`sources.${opp.source}`),
        })}
        action={<Badge status={opp.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="self-start">
          <CardHeader title={t("opportunities.customer")} />
          <CardBody>
            <DetailList
              items={[
                { label: t("opportunities.email"), value: opp.email },
                { label: t("opportunities.phone"), value: opp.phone },
                { label: t("opportunities.coordinator"), value: row.coordinatorName ?? t("common.unassigned") },
                { label: t("opportunities.notes"), value: opp.notes },
              ]}
            />
          </CardBody>
        </Card>

        <div className="grid content-start gap-6">
          {!open && row.leadId && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-brand/30 bg-brand-soft px-5 py-4">
              <p className="text-sm text-brand-strong">{t("opportunities.convertedNote")}</p>
              <ButtonLink href={`/leads/${row.leadId}`} variant="primary">
                {t("opportunities.openLead")}
              </ButtonLink>
            </Card>
          )}

          {open && can(user, "opportunities:edit") && (
            <Card>
              <CardHeader title={t("opportunities.qualifyTitle")} description={t("opportunities.qualifyBody")} />
              <CardBody>
                <InlineForm key={opp.status} action={updateOpportunityStatus}>
                  <Hidden name="id" value={opp.id} />
                  <Autocomplete
                    name="status"
                    defaultValue={opp.status}
                    aria-label={t("opportunities.status")}
                    options={keyedOptions(t, "status", EDITABLE_OPPORTUNITY_STATUSES)}
                  />
                  <Button>{t("opportunities.setStatus")}</Button>
                </InlineForm>
              </CardBody>
            </Card>
          )}

          {coordinators.length > 0 && (
            <Card>
              <CardHeader title={t("opportunities.coordinatorTitle")} />
              <CardBody>
                <InlineForm key={`c-${opp.coordinatorId}`} action={assignCoordinator}>
                  <Hidden name="id" value={opp.id} />
                  <Autocomplete
                    name="coordinatorId"
                    defaultValue={opp.coordinatorId ?? ""}
                    aria-label={t("opportunities.coordinator")}
                    options={[
                      { value: "", label: t("common.unassigned") },
                      ...coordinators.map((c) => ({ value: String(c.id), label: c.name })),
                    ]}
                  />
                  <Button>{t("opportunities.assign")}</Button>
                </InlineForm>
              </CardBody>
            </Card>
          )}

          {open && can(user, "opportunities:convert") && (
            <Card>
              <CardHeader
                title={t("opportunities.convertTitle")}
                description={
                  opp.status === "qualified"
                    ? t("opportunities.convertBody", { department })
                    : t("opportunities.convertNeedsQualified")
                }
              />
              {opp.status === "qualified" && (
                <CardBody>
                  <form
                    action={convertToLead}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                  >
                    <Hidden name="id" value={opp.id} />
                    <Field label={t("opportunities.advisor")}>
                      <Autocomplete
                        name="advisorId"
                        options={advisors.map((a) => ({ value: String(a.id), label: a.name }))}
                        placeholder={t("placeholders.advisor")}
                      />
                    </Field>
                    <Button variant="primary">{t("opportunities.convert")}</Button>
                  </form>
                </CardBody>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
