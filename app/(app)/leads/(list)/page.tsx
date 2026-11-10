import { getTranslations } from "next-intl/server";
import {
  ActionBar,
  Avatar,
  Badge,
  Button,
  CellText,
  DataTable,
  DropdownMenu,
  Forbidden,
  Icon,
  PageHeader,
} from "@/components/ui";
import { EDITABLE_LEAD_STAGES, LEAD_STAGES, type LeadStage } from "@/constants/statuses";
import { shortDate } from "@/lib/format";
import { keyedOptions } from "@/lib/options";
import { pageFrom } from "@/lib/pagination";
import { can, scopeOf } from "@/lib/rbac";
import type { SearchParams } from "@/lib/url";
import { leadPath } from "@/lib/reference";
import { updateLeadStages } from "@/server/actions/leads";
import { requireUser } from "@/server/auth";
import { listLeads } from "@/server/queries/leads";

const BULK_FORM = "lead-bulk";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const scope = scopeOf(user, "leads");
  if (scope === "none") return <Forbidden permission="leads:view_own" />;

  const params = await searchParams;
  const stage = LEAD_STAGES.find((s) => s === params.filter) as LeadStage | undefined;
  const page = pageFrom(params);
  const [{ rows, total }, t] = await Promise.all([listLeads(user, { stage, q: params.q, page }), getTranslations()]);

  const bulk = can(user, "leads:edit");

  return (
    <>
      <PageHeader title={t("leads.title")} description={t("leads.description", { scope: t(`scope.${scope}`) })} />
      {bulk && (
        <form id={BULK_FORM} action={updateLeadStages}>
          <ActionBar form={BULK_FORM} name="leadIds">
            <DropdownMenu
              side="top"
              label={t("leads.bulk.setStage")}
              trigger={
                <Button type="button" size="sm" variant="ghost">
                  <Icon name="edit" size={15} />
                  {t("leads.bulk.setStage")}
                </Button>
              }
              items={EDITABLE_LEAD_STAGES.map((s) => ({
                label: t(`status.${s}`),
                form: BULK_FORM,
                name: "stage",
                value: s,
              }))}
            />
          </ActionBar>
        </form>
      )}
      <DataTable
        select={bulk ? { form: BULK_FORM, name: "leadIds", label: (l) => l.customerName } : undefined}
        path="/leads"
        params={params}
        rows={rows}
        rowKey={(l) => l.id}
        search={{ placeholder: t("leads.search") }}
        filters={{ label: t("leads.stage"), options: keyedOptions(t, "status", LEAD_STAGES) }}
        pagination={{ page: page.page, pageSize: page.limit, total }}
        empty={{ title: t("leads.empty"), icon: "clipboard" }}
        columns={[
          {
            key: "customer",
            header: t("leads.customer"),
            cell: (l) => <CellText href={leadPath(l.publicId)} primary={l.customerName} secondary={l.reference} />,
          },
          {
            key: "product",
            header: t("leads.product"),
            cell: (l) => (
              <CellText
                primary={t(`products.${l.product}`)}
                secondary={l.type === "renewal" ? t("status.renewal") : t(`departments.${l.departmentKey}`)}
              />
            ),
          },
          { key: "stage", header: t("leads.stage"), cell: (l) => <Badge status={l.stage} /> },
          { key: "kyc", header: t("leads.kyc"), cell: (l) => l.kycStatus && <Badge status={l.kycStatus} /> },
          {
            key: "advisor",
            header: t("leads.advisor"),
            cell: (l) =>
              l.advisorName ? (
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={l.advisorName} size="sm" />
                  <span className="truncate">{l.advisorName}</span>
                </span>
              ) : (
                <span className="text-muted">{t("common.unassigned")}</span>
              ),
          },
          { key: "updated", header: t("leads.updated"), nowrap: true, cell: (l) => shortDate(l.updatedAt) },
        ]}
      />
    </>
  );
}
