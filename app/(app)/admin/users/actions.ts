"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";

const { roles, users, departments } = schema;

async function loadTarget(formData: FormData) {
  const user = await requirePermission("users:manage");
  const targetId = Number(formData.get("userId"));
  if (targetId === user.id) throw new Error("You cannot change your own account here");
  const [target] = await db.select().from(users).where(eq(users.id, targetId));
  if (!target) throw new Error("User not found");
  return { user, target };
}

export async function updateUser(formData: FormData) {
  const { user, target } = await loadTarget(formData);
  const roleId = Number(formData.get("roleId"));
  const rawDept = String(formData.get("departmentId") ?? "");

  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  const [dept] = rawDept ? await db.select().from(departments).where(eq(departments.id, Number(rawDept))) : [];
  if (!role || (rawDept && !dept)) throw new Error("Not found");

  await db.update(users).set({ roleId: role.id, departmentId: dept?.id ?? null }).where(eq(users.id, target.id));
  await logAudit({ userId: user.id, action: "update", entity: "user", entityId: target.id, details: `${target.name} → ${role.name}${dept ? `, ${dept.name}` : ""}` });
  revalidatePath("/admin/users");
}

export async function toggleUserActive(formData: FormData) {
  const { user, target } = await loadTarget(formData);
  await db.update(users).set({ active: !target.active }).where(eq(users.id, target.id));
  await logAudit({ userId: user.id, action: target.active ? "deactivate" : "activate", entity: "user", entityId: target.id, details: target.name });
  revalidatePath("/admin/users");
}
