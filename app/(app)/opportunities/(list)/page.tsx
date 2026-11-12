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
  const [{ rows, total, all, statusCounts }, t] = await Promise.all([
    listOpportunities(user, { status, q: params.q, page }),
    getTranslations(),
  ]);
  // Sources other than the fixed ones are stored as typed, so they show as they are
  const source = (s: string) => (t.has(`sources.${s}`) ? t(`sources.${s}`) : s);

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
        rowHref={(o) => `/opportunities/${o.id}`}
        search={{ placeholder: t("opportunities.search") }}
        filters={{
          label: t("opportunities.status"),
          variant: "tabs",
          total: all,
          options: keyedOptions(t, "status", OPPORTUNITY_STATUSES).map((o) => ({
            ...o,
            count: statusCounts[o.value as OpportunityStatus] ?? 0,
          })),
        }}
        pagination={{ page: page.page, pageSize: page.limit, total }}
        empty={{ title: t("opportunities.empty"), icon: "inbox" }}
        mobile="rows"
        summary={(o) => ({
          title: o.customerName,
          meta: [t(`products.${o.product}`), source(o.source), o.coordinatorName ?? t("common.unassigned")],
          badges: <Badge status={o.status} />,
          date: shortDate(o.createdAt),
        })}
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
          { key: "source", header: t("opportunities.source"), priority: 3, cell: (o) => source(o.source) },
          { key: "status", header: t("opportunities.status"), cell: (o) => <Badge status={o.status} /> },
          {
            key: "coordinator",
            header: t("opportunities.coordinator"),
            priority: 2,
            cell: (o) => o.coordinatorName ?? <span className="text-muted">{t("common.unassigned")}</span>,
          },
          {
            key: "received",
            header: t("opportunities.received"),
            nowrap: true,
            cell: (o) => <span className="text-muted">{shortDate(o.createdAt)}</span>,
          },
        ]}
      />
    </>
  );
}
