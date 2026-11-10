import { PERMISSIONS } from "@/constants/permissions";
import type { DepartmentKey } from "@/constants/products";

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function isPermission(value: string): value is Permission {
  return value in PERMISSIONS;
}

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleName: string;
  departmentId: number | null;
  departmentKey: DepartmentKey | null;
  permissions: Permission[];
};

export function can(user: Pick<SessionUser, "permissions">, permission: Permission) {
  return user.permissions.includes(permission);
}

export type Scope = "all" | "department" | "own" | "none";

/** The widest data scope a user has for opportunities or leads: all > department > own. */
export function scopeOf(user: Pick<SessionUser, "permissions">, kind: "opportunities" | "leads"): Scope {
  if (can(user, `${kind}:view_all`)) return "all";
  if (can(user, `${kind}:view_department`)) return "department";
  if (can(user, `${kind}:view_own`)) return "own";
  return "none";
}
