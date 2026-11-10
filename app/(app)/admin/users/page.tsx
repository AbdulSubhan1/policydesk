import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import {
  Button,
  Card,
  CellText,
  Forbidden,
  Hidden,
  InlineForm,
  PageHeader,
  Autocomplete,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { can } from "@/lib/rbac";
import { toggleUserActive, updateUser } from "@/server/actions/users";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/server/db";

const { users, roles, departments } = schema;

export default async function UsersPage() {
  const user = await requireUser();
  if (!can(user, "users:manage")) return <Forbidden permission="users:manage" />;

  const [userRows, roleRows, deptRows, t] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        active: users.active,
        roleId: users.roleId,
        roleName: roles.name,
        departmentId: users.departmentId,
        departmentKey: departments.key,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(users.id),
    db.select({ id: roles.id, name: roles.name }).from(roles).orderBy(roles.id),
    db.select().from(departments).orderBy(departments.id),
    getTranslations(),
  ]);

  return (
    <>
      <PageHeader title={t("users.title")} description={t("users.description")} />
      <Card>
        <Table size="lg">
          <thead>
            <tr>
              <Th>{t("users.user")}</Th>
              <Th>{t("users.roleDepartment")}</Th>
              <Th>{t("users.status")}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {userRows.map((u) => {
              const isMe = u.id === user.id;
              return (
                <Tr key={u.id} className={cn(!u.active && "opacity-60")}>
                  <Td>
                    <CellText primary={isMe ? `${u.name} ${t("users.you")}` : u.name} secondary={u.email} />
                  </Td>
                  <Td>
                    {isMe ? (
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
                          aria-label={t("users.roleDepartment")}
                          options={roleRows.map((r) => ({ value: String(r.id), label: r.name }))}
                        />
                        <Autocomplete
                          name="departmentId"
                          defaultValue={u.departmentId ?? ""}
                          aria-label={t("users.roleDepartment")}
                          options={[
                            { value: "", label: t("users.noDepartment") },
                            ...deptRows.map((d) => ({ value: String(d.id), label: t(`departments.${d.key}`) })),
                          ]}
                        />
                        <Button size="sm">{t("common.save")}</Button>
                      </InlineForm>
                    )}
                  </Td>
                  <Td className={u.active ? "text-brand-strong" : "text-muted"}>
                    {u.active ? t("users.active") : t("users.deactivated")}
                  </Td>
                  <Td className="text-end">
                    {!isMe && (
                      <form action={toggleUserActive}>
                        <Hidden name="userId" value={u.id} />
                        <Button size="sm" variant={u.active ? "danger" : "secondary"}>
                          {u.active ? t("common.deactivate") : t("common.activate")}
                        </Button>
                      </form>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
