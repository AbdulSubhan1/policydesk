"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isPermission } from "@/lib/rbac";
import type { ActionResult } from "@/schemas/action-result";
import { id } from "@/schemas/fields";
import { roleSchema, type RoleInput } from "@/schemas/role";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { assertNotDemoLocked, demoLockError } from "@/server/demo-lock";
import { db, schema } from "@/server/db";

const { roles, rolePermissions } = schema;

export async function createRole(input: RoleInput): Promise<ActionResult> {
  const user = await requirePermission("roles:manage");
  const locked = await demoLockError("roles", user.email, "/admin/roles");
  if (locked) return { ok: false, error: locked };
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const [existing] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(sql`lower(${roles.name}) = lower(${parsed.data.name})`);
  if (existing) return { ok: false, error: "errors.duplicateName" };

  const [role] = await db.insert(roles).values(parsed.data).returning();
  await db.insert(rolePermissions).values({ roleId: role.id, permission: "dashboard:view" });
  await logAudit({ userId: user.id, action: "create", entity: "role", entityId: role.id, details: role.name });
  revalidatePath("/admin/roles");
  return { ok: true };
}

export async function saveRolePermissions(formData: FormData) {
  const user = await requirePermission("roles:manage");
  await assertNotDemoLocked("roles", user.email, "/admin/roles");
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, id.parse(formData.get("roleId"))));
  if (!role) throw new Error("errors.notFound");
  if (role.isSystem) throw new Error("System roles cannot be changed");

  const selected = formData.getAll("permissions").map(String).filter(isPermission);
  // neon-http has no transactions; delete-then-insert is fine for a small permission set
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
  if (selected.length)
    await db.insert(rolePermissions).values(selected.map((permission) => ({ roleId: role.id, permission })));
  await logAudit({
    userId: user.id,
    action: "permissions",
    entity: "role",
    entityId: role.id,
    details: `${role.name}: ${selected.length}`,
  });
  revalidatePath("/", "layout");
}
