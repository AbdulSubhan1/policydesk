import { and, eq, sql } from "drizzle-orm";
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

const { departments } = schema;

/** Every user with their role and department, for the Users admin page. */
export function listUsers() {
  return db
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
    .orderBy(users.id);
}

export function listRoles() {
  return db.select().from(roles).orderBy(roles.id);
}

export function listDepartments() {
  return db.select().from(departments).orderBy(departments.id);
}

/** Granted permissions as "roleId:permission" and active users per role, for the Roles admin page. */
export async function roleMatrix() {
  const [grants, counts] = await Promise.all([
    db.select().from(rolePermissions),
    db
      .select({ roleId: users.roleId, count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.active, true))
      .groupBy(users.roleId),
  ]);
  return {
    granted: new Set(grants.map((g) => `${g.roleId}:${g.permission}`)),
    activeUsers: new Map(counts.map((c) => [c.roleId, c.count])),
  };
}
