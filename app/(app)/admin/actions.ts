"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { isPermission } from "@/lib/rbac";

const { roles, rolePermissions, users } = schema;

export type FormState = { error?: string };

export async function saveRolePermissions(formData: FormData) {
  const user = await requirePermission("roles:manage");
  const roleId = Number(formData.get("roleId"));
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  if (!role) throw new Error("Role not found");
  if (role.isSystem) throw new Error("System roles cannot be changed");

  const selected = formData.getAll("permissions").map(String).filter(isPermission);

  // neon-http has no transactions; delete-then-insert is fine for a small permission set
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
  if (selected.length) {
    await db.insert(rolePermissions).values(selected.map((permission) => ({ roleId: role.id, permission })));
  }
  await logAudit({ userId: user.id, action: "permissions", entity: "role", entityId: role.id, details: `${role.name}: ${selected.length} permissions` });
  revalidatePath("/", "layout");
}

const roleSchema = z.object({
  name: z.string().trim().min(2, "Role name is too short").max(40),
  description: z.string().trim().max(200).default(""),
});

export async function createRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("roles:manage");
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, parsed.data.name));
  if (existing) return { error: "A role with this name already exists" };

  const [role] = await db.insert(roles).values(parsed.data).returning();
  await db.insert(rolePermissions).values({ roleId: role.id, permission: "dashboard:view" });
  await logAudit({ userId: user.id, action: "create", entity: "role", entityId: role.id, details: role.name });
  revalidatePath("/admin/roles");
  return {};
}

export async function changeUserRole(formData: FormData) {
  const user = await requirePermission("users:manage");
  const targetId = Number(formData.get("userId"));
  const roleId = Number(formData.get("roleId"));
  if (targetId === user.id) throw new Error("You cannot change your own role");

  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  const [target] = await db.select().from(users).where(eq(users.id, targetId));
  if (!role || !target) throw new Error("Not found");

  await db.update(users).set({ roleId: role.id }).where(eq(users.id, target.id));
  await logAudit({ userId: user.id, action: "role", entity: "user", entityId: target.id, details: `${target.name} → ${role.name}` });
  revalidatePath("/admin/users");
}

export async function toggleUserActive(formData: FormData) {
  const user = await requirePermission("users:manage");
  const targetId = Number(formData.get("userId"));
  if (targetId === user.id) throw new Error("You cannot deactivate yourself");

  const [target] = await db.select().from(users).where(eq(users.id, targetId));
  if (!target) throw new Error("Not found");

  await db.update(users).set({ active: !target.active }).where(eq(users.id, target.id));
  await logAudit({ userId: user.id, action: target.active ? "deactivate" : "activate", entity: "user", entityId: target.id, details: target.name });
  revalidatePath("/admin/users");
}
