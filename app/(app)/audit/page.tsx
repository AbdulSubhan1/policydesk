import { desc, eq } from "drizzle-orm";
import { EmptyRow, Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { can } from "@/lib/rbac";

const { auditLogs, users } = schema;

export default async function AuditPage() {
  const user = await requireUser();
  if (!can(user, "audit:view")) return <Forbidden permission="audit:view" />;

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.id))
    .limit(100);

  return (
    <>
      <PageHeader title="Audit log" description="Every change made in the CRM, newest first (last 100)." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <EmptyRow colSpan={4}>Nothing logged yet.</EmptyRow>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                  {new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-4 py-3 text-slate-900">{r.userName ?? "System"}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                    {r.entity}.{r.action}
                    {r.entityId ? ` #${r.entityId}` : ""}
                  </code>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
