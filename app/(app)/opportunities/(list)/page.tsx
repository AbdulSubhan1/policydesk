import { getTranslations } from "next-intl/server";
import { Badge, ButtonLink, CellText, DataTable, Forbidden, PageHeader } from "@/components/ui";
import { OPPORTUNITY_STATUSES, type OpportunityStatus } from "@/constants/statuses";
import { shortDate } from "@/lib/format";
import { keyedOptions } from "@/lib/options";
import { pageFrom } from "@/lib/pagination";
import { can, scopeOf } from "@/lib/rbac";
import type { SearchParams } from "@/lib/url";
import { requireUser } from "@/server/auth";
import { listOpportunities } from "@/server/queries/opportunities";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const scope = scopeOf(user, "opportunities");
  if (scope === "none") return <Forbidden permission="opportunities:view_own" />;

  const params = await searchParams;
  const status = OPPORTUNITY_STATUSES.find((s) => s === params.filter) as OpportunityStatus | undefined;
  const page = pageFrom(params);
  const [{ rows, total }, t] = await Promise.all([
    listOpportunities(user, { status, q: params.q, page }),
    getTranslations(),
  ]);

  return (
    <>
      <PageHeader
        title={t("opportunities.title")}
        description={t("opportunities.description", { scope: t(`scope.${scope}`) })}
        action={
          can(user, "opportunities:create") && (
            <ButtonLink href="/opportunities/new" variant="primary">
              {t("opportunities.new")}
            </ButtonLink>
          )
        }
      />
      <DataTable
        path="/opportunities"
        params={params}
        rows={rows}
        rowKey={(o) => o.id}
        search={{ placeholder: t("opportunities.search") }}
        filters={{ label: t("opportunities.status"), options: keyedOptions(t, "status", OPPORTUNITY_STATUSES) }}
        pagination={{ page: page.page, pageSize: page.limit, total }}
        empty={{ title: t("opportunities.empty"), icon: "inbox" }}
        columns={[
          {
            key: "customer",
            header: t("opportunities.customer"),
            cell: (o) => <CellText href={`/opportunities/${o.id}`} primary={o.customerName} secondary={o.email} />,
          },
          {
            key: "product",
            header: t("opportunities.product"),
            cell: (o) => (
              <CellText primary={t(`products.${o.product}`)} secondary={t(`departments.${o.departmentKey}`)} />
            ),
          },
          { key: "status", header: t("opportunities.status"), cell: (o) => <Badge status={o.status} /> },
          {
            key: "coordinator",
            header: t("opportunities.coordinator"),
            cell: (o) => o.coordinatorName ?? t("common.unassigned"),
          },
          { key: "received", header: t("opportunities.received"), nowrap: true, cell: (o) => shortDate(o.createdAt) },
        ]}
      />
    </>
  );
}
