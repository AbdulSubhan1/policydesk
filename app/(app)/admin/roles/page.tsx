import { getTranslations } from "next-intl/server";
import { DemoLockedNotice } from "@/components/demo-locked-notice";
import { RoleForm } from "@/components/forms/role-form";
import { Badge, Button, Checkbox, Forbidden, Hidden, PageHeader, Panel } from "@/components/ui";
import { PERMISSIONS } from "@/constants/permissions";
import { ALL_PERMISSIONS, can } from "@/lib/rbac";
import { saveRolePermissions } from "@/server/actions/roles";
import { requireUser } from "@/server/auth";
import { isDemoLocked } from "@/server/demo-lock";
import { listRoles, roleMatrix } from "@/server/queries/users";

const GROUPS = [...new Set(Object.values(PERMISSIONS))];

export default async function RolesPage() {
  const user = await requireUser();
  if (!can(user, "roles:manage")) return <Forbidden permission="roles:manage" />;

  const [roleRows, { granted, activeUsers }, t, locked] = await Promise.all([
    listRoles(),
    roleMatrix(),
    getTranslations(),
    isDemoLocked(),
  ]);

  return (
    <>
      <PageHeader title={t("roles.title")} description={t("roles.description")} />
      {locked ? <DemoLockedNotice /> : <RoleForm />}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {roleRows.map((role) => (
          <Panel
            key={role.id}
            title={role.name}
            description={`${role.description} ${t("roles.activeUsers", { count: activeUsers.get(role.id) ?? 0 })}`.trim()}
            actions={
              role.isSystem || locked ? (
                <Badge tone="grey">{t("roles.locked")}</Badge>
              ) : (
                // The button sits in the panel header, outside the form, so it names the form it submits
                <Button variant="primary" form={`role-${role.id}`}>
                  {t("common.save")}
                </Button>
              )
            }
          >
            <form id={`role-${role.id}`} action={saveRolePermissions}>
              <Hidden name="roleId" value={role.id} />
              <fieldset disabled={role.isSystem || locked} className="grid gap-5">
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
            </form>
          </Panel>
        ))}
      </div>
    </>
  );
}
