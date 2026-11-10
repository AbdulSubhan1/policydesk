import { getTranslations } from "next-intl/server";
import { Badge, CellText, DataTable, Forbidden, PageHeader } from "@/components/ui";
import { LEAD_STAGES, type LeadStage } from "@/constants/statuses";
import { shortDate } from "@/lib/format";
import { keyedOptions } from "@/lib/options";
import { pageFrom } from "@/lib/pagination";
import { scopeOf } from "@/lib/rbac";
import type { SearchParams } from "@/lib/url";
import { requireUser } from "@/server/auth";
import { listLeads } from "@/server/queries/leads";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const scope = scopeOf(user, "leads");
  if (scope === "none") return <Forbidden permission="leads:view_own" />;

  const params = await searchParams;
  const stage = LEAD_STAGES.find((s) => s === params.filter) as LeadStage | undefined;
  const page = pageFrom(params);
  const [{ rows, total }, t] = await Promise.all([listLeads(user, { stage, q: params.q, page }), getTranslations()]);

  return (
    <>
      <PageHeader title={t("leads.title")} description={t("leads.description", { scope: t(`scope.${scope}`) })} />
      <DataTable
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
            cell: (l) => (
              <CellText
                href={`/leads/${l.id}`}
                primary={l.customerName}
                secondary={t("leads.leadNumber", { id: l.id })}
              />
            ),
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
          { key: "advisor", header: t("leads.advisor"), cell: (l) => l.advisorName ?? t("common.unassigned") },
          { key: "updated", header: t("leads.updated"), nowrap: true, cell: (l) => shortDate(l.updatedAt) },
        ]}
      />
    </>
  );
}
