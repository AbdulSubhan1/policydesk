import { getTranslations } from "next-intl/server";
import {
  AlertDialog,
  Autocomplete,
  Avatar,
  Button,
  CellText,
  DataTable,
  Forbidden,
  Hidden,
  InlineForm,
  PageHeader,
} from "@/components/ui";
import { can } from "@/lib/rbac";
import { toggleUserActive, toggleUserAvailable, updateUser } from "@/server/actions/users";
import { requireUser } from "@/server/auth";
import { listDepartments, listRoles, listUsers } from "@/server/queries/users";

export default async function UsersPage() {
  const user = await requireUser();
  if (!can(user, "users:manage")) return <Forbidden permission="users:manage" />;

  const [userRows, roleRows, deptRows, t] = await Promise.all([
    listUsers(),
    listRoles(),
    listDepartments(),
    getTranslations(),
  ]);
  const roleOptions = roleRows.map((r) => ({ value: String(r.id), label: r.name }));
  const deptOptions = [
    { value: "", label: t("users.noDepartment") },
    ...deptRows.map((d) => ({ value: String(d.id), label: t(`departments.${d.key}`) })),
  ];

  return (
    <>
      <PageHeader title={t("users.title")} description={t("users.description")} />
      <DataTable
        path="/admin/users"
        rows={userRows}
        rowKey={(u) => u.id}
        minWidth="lg"
        empty={{ title: t("users.title"), icon: "users" }}
        columns={[
          {
            key: "user",
            header: t("users.user"),
            cell: (u) => (
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={u.name} />
                <CellText
                  primary={u.id === user.id ? `${u.name} ${t("users.you")}` : u.name}
                  secondary={u.phone ? `${u.email} · ${u.phone}` : u.email}
                />
              </span>
            ),
          },
          {
            key: "role",
            header: t("users.roleDepartment"),
            cell: (u) =>
              u.id === user.id ? (
                <CellText
                  primary={u.roleName}
                  secondary={u.departmentKey ? t(`departments.${u.departmentKey}`) : undefined}
                />
              ) : (
                <InlineForm key={`${u.roleId}-${u.departmentId}`} action={updateUser}>
                  <Hidden name="userId" value={u.id} />
                  <Autocomplete
                    name="roleId"
                    defaultValue={u.roleId}
                    aria-label={t("users.role")}
                    options={roleOptions}
                  />
                  <Autocomplete
                    name="departmentId"
                    defaultValue={u.departmentId ?? ""}
                    aria-label={t("users.department")}
                    options={deptOptions}
                  />
                  <Button size="sm">{t("common.save")}</Button>
                </InlineForm>
              ),
          },
          {
            key: "status",
            header: t("users.status"),
            cell: (u) => (
              <span className={u.active ? "text-brand-strong" : "text-muted"}>
                {u.active ? t("users.active") : t("users.deactivated")}
              </span>
            ),
          },
          {
            key: "available",
            header: t("users.available"),
            // Automatic assignment skips people marked unavailable
            cell: (u) => (
              <span className="flex items-center gap-3">
                <span className={u.available ? "text-brand-strong" : "text-muted"}>
                  {u.available ? t("common.yes") : t("common.no")}
                </span>
                {u.id !== user.id && (
                  <form action={toggleUserAvailable}>
                    <Hidden name="userId" value={u.id} />
                    <Button size="sm" variant="ghost">
                      {u.available ? t("users.setUnavailable") : t("users.setAvailable")}
                    </Button>
                  </form>
                )}
              </span>
            ),
          },
          {
            key: "toggle",
            header: "",
            align: "end",
            cell: (u) =>
              u.id !== user.id && (
                <form action={toggleUserActive}>
                  <Hidden name="userId" value={u.id} />
                  {u.active ? (
                    <AlertDialog
                      trigger={
                        <Button type="button" size="sm" variant="danger">
                          {t("common.deactivate")}
                        </Button>
                      }
                      title={t("users.deactivateTitle", { name: u.name })}
                      description={t("users.deactivateBody")}
                      confirmLabel={t("common.deactivate")}
                    />
                  ) : (
                    <Button size="sm">{t("common.activate")}</Button>
                  )}
                </form>
              ),
          },
        ]}
      />
    </>
  );
}
