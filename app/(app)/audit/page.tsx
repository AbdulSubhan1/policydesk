import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Card, EmptyRow, Forbidden, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { can } from "@/lib/rbac";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/server/db";

const { auditLogs, users } = schema;

export default async function AuditPage() {
  const user = await requireUser();
  if (!can(user, "audit:view")) return <Forbidden permission="audit:view" />;

  const [rows, t] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        leadId: auditLogs.leadId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(150),
    getTranslations(),
  ]);

  return (
    <>
      <PageHeader title={t("audit.title")} description={t("audit.description")} />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t("audit.when")}</Th>
              <Th>{t("audit.who")}</Th>
              <Th>{t("audit.action")}</Th>
              <Th>{t("audit.details")}</Th>
              <Th>{t("audit.lead")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={5}>{t("audit.empty")}</EmptyRow>}
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="whitespace-nowrap text-muted">{dateTime(r.createdAt)}</Td>
                <Td>{r.userName ?? t("lead.system")}</Td>
                <Td className="font-mono text-xs whitespace-nowrap text-ink-soft">
                  {r.entity}.{r.action}
                  {r.entityId ? ` #${r.entityId}` : ""}
                </Td>
                <Td className="max-w-80 [overflow-wrap:anywhere] text-ink-soft">{r.details}</Td>
                <Td>
                  {r.leadId && (
                    <Link href={`/leads/${r.leadId}`} className="text-brand hover:underline">
                      #{r.leadId}
                    </Link>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
