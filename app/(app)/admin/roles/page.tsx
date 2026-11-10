import { eq, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { RoleForm } from "@/components/forms/role-form";
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, Forbidden, Hidden, PageHeader } from "@/components/ui";
import { PERMISSIONS } from "@/constants/permissions";
import { ALL_PERMISSIONS, can } from "@/lib/rbac";
import { saveRolePermissions } from "@/server/actions/roles";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/server/db";

const { roles, rolePermissions, users } = schema;
const GROUPS = [...new Set(Object.values(PERMISSIONS))];

export default async function RolesPage() {
  const user = await requireUser();
  if (!can(user, "roles:manage")) return <Forbidden permission="roles:manage" />;

  const [roleRows, grants, userCounts, t] = await Promise.all([
    db.select().from(roles).orderBy(roles.id),
    db.select().from(rolePermissions),
    db
      .select({ roleId: users.roleId, count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.active, true))
      .groupBy(users.roleId),
    getTranslations(),
  ]);
  const granted = new Set(grants.map((g) => `${g.roleId}:${g.permission}`));
  const countByRole = new Map(userCounts.map((c) => [c.roleId, c.count]));

  return (
    <>
      <PageHeader title={t("roles.title")} description={t("roles.description")} />
      <RoleForm />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {roleRows.map((role) => (
          <Card key={role.id}>
            <form action={saveRolePermissions}>
              <Hidden name="roleId" value={role.id} />
              <CardHeader
                title={role.name}
                description={`${role.description} ${t("roles.activeUsers", { count: countByRole.get(role.id) ?? 0 })}`.trim()}
                action={
                  role.isSystem ? (
                    <Badge tone="grey">{t("roles.locked")}</Badge>
                  ) : (
                    <Button variant="primary">{t("common.save")}</Button>
                  )
                }
              />
              <CardBody>
                <fieldset disabled={role.isSystem} className="grid gap-5">
                  {GROUPS.map((group) => (
                    <div key={group} className="grid gap-2">
                      <p className="text-xs font-medium text-muted">{t(`permissionGroups.${group}`)}</p>
                      {ALL_PERMISSIONS.filter((p) => PERMISSIONS[p] === group).map((p) => (
                        <Checkbox
                          key={p}
                          name="permissions"
                          value={p}
                          defaultChecked={granted.has(`${role.id}:${p}`)}
                          label={t(`permissions.${p}`)}
                        />
                      ))}
                    </div>
                  ))}
                </fieldset>
              </CardBody>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
