import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE, SESSION_DAYS } from "@/constants/config";
import { db, schema } from "@/server/db";
import { can, isPermission, type Permission, type SessionUser } from "@/lib/rbac";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(value ?? "local-dev-secret-not-for-production");
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

async function sessionUserId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return Number(payload.sub);
  } catch {
    return null;
  }
}

// Permissions are read from the database on every request, so a role change applies immediately
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const id = await sessionUserId();
  if (!id) return null;

  const [row] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      active: schema.users.active,
      roleId: schema.roles.id,
      roleName: schema.roles.name,
      departmentId: schema.users.departmentId,
      departmentKey: schema.departments.key,
    })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .leftJoin(schema.departments, eq(schema.users.departmentId, schema.departments.id))
    .where(eq(schema.users.id, id));
  if (!row || !row.active) return null;

  const perms = await db
    .select({ permission: schema.rolePermissions.permission })
    .from(schema.rolePermissions)
    .where(eq(schema.rolePermissions.roleId, row.roleId));

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.roleId,
    roleName: row.roleName,
    departmentId: row.departmentId,
    departmentKey: row.departmentKey,
    permissions: perms.map((p) => p.permission).filter(isPermission),
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
  }
}

/** Server-side guard for actions. The UI also hides buttons, but this is the real check. */
export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user, permission)) throw new ForbiddenError(permission);
  return user;
}
