import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge, Button, CellText, DataTable, Forbidden, Hidden, PageHeader } from "@/components/ui";
import { POLICY_FILTERS } from "@/constants/statuses";
import { money, shortDate } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { keyedOptions } from "@/lib/options";
import { pageFrom } from "@/lib/pagination";
import { can, scopeOf } from "@/lib/rbac";
import type { SearchParams } from "@/lib/url";
import { startRenewal } from "@/server/actions/policies";
import { requireUser } from "@/server/auth";
import { listPolicies, type PolicyFilter } from "@/server/queries/policies";

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  if (!can(user, "policies:view")) return <Forbidden permission="policies:view" />;

  const params = await searchParams;
  const filter = POLICY_FILTERS.find((f) => f === params.filter) as PolicyFilter | undefined;
  const page = pageFrom(params);
  const [{ rows, total }, t, locale] = await Promise.all([
    listPolicies(user, { filter, q: params.q, page }),
    getTranslations(),
    getLocale(),
  ]);
  const scope = scopeOf(user, "leads");
  const canRenew = can(user, "policies:renew");

  return (
    <>
      <PageHeader
        title={t("policies.title")}
        description={t("policies.description", { scope: scope === "none" ? "" : t(`scope.${scope}`) })}
      />
      <DataTable
        path="/policies"
        params={params}
        rows={rows}
        rowKey={(p) => p.id}
        minWidth="lg"
        search={{ placeholder: t("policies.search") }}
        filters={{ label: t("policies.status"), options: keyedOptions(t, "status", POLICY_FILTERS) }}
        pagination={{ page: page.page, pageSize: page.limit, total }}
        empty={{ title: t("policies.empty"), icon: "shield" }}
        columns={[
          {
            key: "policy",
            header: t("policies.policy"),
            nowrap: true,
            cell: (p) => <span className="font-mono text-xs text-ink-soft">{p.policyNumber}</span>,
          },
          {
            key: "customer",
            header: t("policies.customer"),
            cell: (p) => (
              <CellText
                href={`/leads/${p.leadId}?tab=policy`}
                primary={p.customerName}
                secondary={`${t(`products.${p.product}`)}, ${p.advisorName ?? t("policies.noAdvisor")}`}
              />
            ),
          },
          {
            key: "insurer",
            header: t("policies.insurer"),
            cell: (p) => <CellText primary={p.insurer} secondary={localized(p.planName, locale)} />,
          },
          { key: "premium", header: t("policies.premium"), align: "end", nowrap: true, cell: (p) => money(p.premium) },
          {
            key: "ends",
            header: t("policies.ends"),
            nowrap: true,
            cell: (p) => (
              <span className={p.renewalDue ? "font-medium text-warn" : undefined}>{shortDate(p.endDate)}</span>
            ),
          },
          { key: "status", header: t("policies.status"), cell: (p) => <Badge status={p.status} /> },
          { key: "payment", header: t("policies.payment"), cell: (p) => <Badge status={p.paymentStatus} /> },
          {
            key: "renewal",
            header: "",
            align: "end",
            cell: (p) =>
              p.renewedByLeadId ? (
                <Link
                  href={`/leads/${p.renewedByLeadId}`}
                  className="text-sm whitespace-nowrap text-plum hover:underline"
                >
                  {t("policies.renewal")}
                </Link>
              ) : (
                p.renewalDue &&
                canRenew && (
                  <form action={startRenewal}>
                    <Hidden name="policyId" value={p.id} />
                    <Button size="sm">{t("policies.renew")}</Button>
                  </form>
                )
              ),
          },
        ]}
      />
    </>
  );
}
