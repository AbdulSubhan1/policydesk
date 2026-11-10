import { eq, sql } from "drizzle-orm";
import { Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ALL_PERMISSIONS, can, PERMISSIONS } from "@/lib/rbac";
import { saveRolePermissions } from "./actions";
import { RoleForm } from "./role-form";

const { roles, rolePermissions, users } = schema;

export default async function RolesPage() {
  const user = await requireUser();
  if (!can(user, "roles:manage")) return <Forbidden permission="roles:manage" />;

  const [roleRows, grants, userCounts] = await Promise.all([
    db.select().from(roles).orderBy(roles.id),
    db.select().from(rolePermissions),
    db
      .select({ roleId: users.roleId, count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.active, true))
      .groupBy(users.roleId),
  ]);

  const granted = new Set(grants.map((g) => `${g.roleId}:${g.permission}`));
  const countByRole = new Map(userCounts.map((c) => [c.roleId, c.count]));
  const groups = [...new Set(ALL_PERMISSIONS.map((p) => PERMISSIONS[p].group))];

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Permissions are stored in the database and checked on every request, so changes apply immediately."
      />

      <RoleForm />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {roleRows.map((role) => (
          <form key={role.id} action={saveRolePermissions} className="card p-5">
            <input type="hidden" name="roleId" value={role.id} />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">
                  {role.name}
                  {role.isSystem && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">locked</span>
                  )}
                </h2>
                <p className="text-sm text-slate-500">{role.description}</p>
                <p className="mt-1 text-xs text-slate-400">{countByRole.get(role.id) ?? 0} active users</p>
              </div>
              {!role.isSystem && <button className="btn-primary shrink-0">Save</button>}
            </div>

            <fieldset disabled={role.isSystem} className="grid gap-4">
              {groups.map((group) => (
                <div key={group}>
                  <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">{group}</p>
                  <div className="grid gap-1.5">
                    {ALL_PERMISSIONS.filter((p) => PERMISSIONS[p].group === group).map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          name="permissions"
                          value={p}
                          defaultChecked={granted.has(`${role.id}:${p}`)}
                          className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                        />
                        {PERMISSIONS[p].label}
                        <code className="ml-auto hidden text-xs text-slate-400 md:inline">{p}</code>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </fieldset>
          </form>
        ))}
      </div>
    </>
  );
}
