import { and, eq } from "drizzle-orm";
import type { Permission } from "@/lib/rbac";
import { db, schema } from "@/server/db";

const { users, roles, rolePermissions } = schema;

/** Active users in a department whose role grants a permission, e.g. advisors who can quote. */
export async function usersWithPermission(departmentId: number, permission: Permission) {
  return db
    .selectDistinct({ id: users.id, name: users.name, role: roles.name })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(
      and(eq(users.departmentId, departmentId), eq(users.active, true), eq(rolePermissions.permission, permission)),
    )
    .orderBy(users.name);
}
