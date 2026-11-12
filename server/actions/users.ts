"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { id } from "@/schemas/fields";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { db, schema } from "@/server/db";
import { assertNotDemoLocked } from "@/server/demo-lock";

const { roles, users, departments } = schema;

async function requireOtherUser(formData: FormData) {
  const user = await requirePermission("users:manage");
  await assertNotDemoLocked("users", user.email, "/admin/users");
  const targetId = id.parse(formData.get("userId"));
  if (targetId === user.id) throw new Error("You cannot change your own account here");
  const [target] = await db.select().from(users).where(eq(users.id, targetId));
  if (!target) throw new Error("errors.notFound");
  return { user, target };
}

export async function updateUser(formData: FormData) {
  const { user, target } = await requireOtherUser(formData);
  const rawDept = String(formData.get("departmentId") ?? "");
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, id.parse(formData.get("roleId"))));
  const [dept] = rawDept
    ? await db
        .select()
        .from(departments)
        .where(eq(departments.id, Number(rawDept)))
    : [];
  if (!role || (rawDept && !dept)) throw new Error("errors.notFound");

  await db
    .update(users)
    .set({ roleId: role.id, departmentId: dept?.id ?? null })
    .where(eq(users.id, target.id));
  await logAudit({
    userId: user.id,
    action: "update",
    entity: "user",
    entityId: target.id,
    details: [target.name, role.name, dept?.key].filter(Boolean).join(", "),
  });
  revalidatePath("/admin/users");
}

export async function toggleUserActive(formData: FormData) {
  const { user, target } = await requireOtherUser(formData);
  await db.update(users).set({ active: !target.active }).where(eq(users.id, target.id));
  await logAudit({
    userId: user.id,
    action: target.active ? "deactivate" : "activate",
    entity: "user",
    entityId: target.id,
    details: target.name,
  });
  revalidatePath("/admin/users");
}

/** Unavailable people keep signing in but are skipped by automatic assignment. */
export async function toggleUserAvailable(formData: FormData) {
  const { user, target } = await requireOtherUser(formData);
  await db.update(users).set({ available: !target.available }).where(eq(users.id, target.id));
  await logAudit({
    userId: user.id,
    action: target.available ? "unavailable" : "available",
    entity: "user",
    entityId: target.id,
    details: target.name,
  });
  revalidatePath("/admin/users");
}
