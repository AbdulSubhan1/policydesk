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
import { leadPath } from "@/lib/reference";
import { startRenewal } from "@/server/actions/policies";
import { requireUser } from "@/server/auth";
import { listPolicies, type PolicyFilter } from "@/server/queries/policies";

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  if (!can(user, "policies:view")) return <Forbidden permission="policies:view" />;

  const params = await searchParams;
  const filter = POLICY_FILTERS.find((f) => f === params.filter) as PolicyFilter | undefined;
  const page = pageFrom(params);
  const [{ rows, total, all, filterCounts }, t, locale] = await Promise.all([
    listPolicies(user, { filter, q: params.q, page }),
    getTranslations(),
    getLocale(),
  ]);
  const scope = scopeOf(user, "leads");
  const canRenew = can(user, "policies:renew");

  type Row = (typeof rows)[number];
  const ends = (p: Row) => (
    <span className="inline-flex flex-wrap items-center gap-1.5 whitespace-nowrap">
      {shortDate(p.endDate)}
      {p.renewalDue && !p.renewalPublicId && <Badge tone="amber">{t("policies.dueSoon")}</Badge>}
    </span>
  );
  // "Booked" already means waiting for payment, so payment gets its own badge only when it failed or was refunded
  const states = (p: Row) => (
    <span className="flex flex-wrap gap-1.5">
      <Badge status={p.status} />
      {(p.paymentStatus === "failed" || p.paymentStatus === "refunded") && <Badge status={p.paymentStatus} />}
    </span>
  );

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
        rowHref={(p) => leadPath(p.leadPublicId, "policy")}
        search={{ placeholder: t("policies.search") }}
        filters={{
          label: t("policies.status"),
          variant: "tabs",
          total: all,
          options: keyedOptions(t, "status", POLICY_FILTERS).map((o) => ({
            ...o,
            count: filterCounts[o.value as PolicyFilter],
          })),
        }}
        pagination={{ page: page.page, pageSize: page.limit, total }}
        empty={{ title: t("policies.empty"), icon: "shield" }}
        mobile="rows"
        summary={(p) => ({
          title: p.customerName,
          amount: money(p.premium),
          meta: [
            <span key="number" className="font-mono text-xs">
              {p.policyNumber}
            </span>,
            p.insurer,
            p.advisorName,
          ],
          badges: states(p),
          date: ends(p),
        })}
        columns={[
          {
            key: "customer",
            header: t("policies.customer"),
            cell: (p) => (
              <CellText href={leadPath(p.leadPublicId, "policy")} primary={p.customerName} secondary={p.policyNumber} />
            ),
          },
          {
            key: "insurer",
            header: t("policies.insurer"),
            priority: 2,
            cell: (p) => <CellText primary={p.insurer} secondary={localized(p.planName, locale)} />,
          },
          { key: "premium", header: t("policies.premium"), numeric: true, cell: (p) => money(p.premium) },
          { key: "ends", header: t("policies.ends"), cell: ends },
          { key: "status", header: t("policies.status"), cell: states },
          {
            key: "advisor",
            header: t("policies.advisor"),
            priority: 3,
            cell: (p) => p.advisorName ?? <span className="text-muted">{t("policies.noAdvisor")}</span>,
          },
          {
            key: "renewal",
            header: "",
            align: "end",
            cell: (p) =>
              p.renewalPublicId ? (
                <Link
                  href={leadPath(p.renewalPublicId)}
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
