import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DataTable, Forbidden, PageHeader } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { pageFrom } from "@/lib/pagination";
import { can } from "@/lib/rbac";
import type { SearchParams } from "@/lib/url";
import { requireUser } from "@/server/auth";
import { listAudit } from "@/server/queries/audit";

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  if (!can(user, "audit:view")) return <Forbidden permission="audit:view" />;

  const params = await searchParams;
  const page = pageFrom(params);
  const [{ rows, total }, t] = await Promise.all([listAudit({ q: params.q, page }), getTranslations()]);

  return (
    <>
      <PageHeader title={t("audit.title")} description={t("audit.description")} />
      <DataTable
        path="/audit"
        params={params}
        rows={rows}
        rowKey={(r) => r.id}
        search={{ placeholder: t("audit.search") }}
        pagination={{ page: page.page, pageSize: page.limit, total }}
        empty={{ title: t("audit.empty"), icon: "scroll" }}
        columns={[
          {
            key: "when",
            header: t("audit.when"),
            nowrap: true,
            cell: (r) => <span className="text-muted">{dateTime(r.createdAt)}</span>,
          },
          { key: "who", header: t("audit.who"), cell: (r) => r.userName ?? t("lead.system") },
          {
            key: "action",
            header: t("audit.action"),
            nowrap: true,
            cell: (r) => (
              <span className="font-mono text-xs text-ink-soft">
                {r.entity}.{r.action}
                {r.entityId ? ` #${r.entityId}` : ""}
              </span>
            ),
          },
          {
            key: "details",
            header: t("audit.details"),
            cell: (r) => <span className="[overflow-wrap:anywhere] text-ink-soft">{r.details}</span>,
          },
          {
            key: "lead",
            header: t("audit.lead"),
            cell: (r) =>
              r.leadId && (
                <Link href={`/leads/${r.leadId}`} className="text-brand hover:underline">
                  #{r.leadId}
                </Link>
              ),
          },
        ]}
      />
    </>
  );
}
