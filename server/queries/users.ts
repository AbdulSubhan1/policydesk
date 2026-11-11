import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { CLOSED_LEAD_STAGES, OPEN_OPPORTUNITY_STATUSES } from "@/constants/statuses";
import type { Permission } from "@/lib/rbac";
import { db, schema } from "@/server/db";

const { users, roles, rolePermissions, opportunities, leads } = schema;

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

/**
 * Active, available users with a role in a department, with their open workload for automatic assignment.
 * Open = opportunities still being qualified, plus website opportunities already converted whose lead is not won or lost,
 * so self-serve journeys count too.
 */
export function assignmentCandidates(departmentId: number, roleName: string) {
  const websiteLeadOpen = sql`exists (select 1 from ${leads} where ${and(
    eq(leads.opportunityId, opportunities.id),
    notInArray(leads.stage, [...CLOSED_LEAD_STAGES]),
  )})`;
  const openCount = sql<number>`(select count(*)::int from ${opportunities} where ${and(
    eq(opportunities.coordinatorId, users.id),
    or(
      inArray(opportunities.status, [...OPEN_OPPORTUNITY_STATUSES]),
      and(eq(opportunities.source, "website"), eq(opportunities.status, "converted"), websiteLeadOpen),
    ),
  )})`;
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      lastAssignedAt: users.lastAssignedAt,
      openCount,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(
      and(
        eq(users.departmentId, departmentId),
        eq(roles.name, roleName),
        eq(users.active, true),
        eq(users.available, true),
      ),
    );
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
