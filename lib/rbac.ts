export const PERMISSIONS = {
  "dashboard:view": { group: "Dashboard", label: "View dashboard" },
  "leads:view_all": { group: "Leads", label: "View all leads" },
  "leads:view_own": { group: "Leads", label: "View leads assigned to me" },
  "leads:create": { group: "Leads", label: "Create leads" },
  "leads:edit": { group: "Leads", label: "Edit leads and change status" },
  "leads:assign": { group: "Leads", label: "Assign leads to agents" },
  "quotes:create": { group: "Quotes", label: "Create quotes" },
  "quotes:approve": { group: "Quotes", label: "Accept or reject quotes" },
  "policies:view": { group: "Policies", label: "View policies" },
  "policies:issue": { group: "Policies", label: "Issue policies from accepted quotes" },
  "policies:cancel": { group: "Policies", label: "Cancel policies" },
  "users:manage": { group: "Admin", label: "Manage users and their roles" },
  "roles:manage": { group: "Admin", label: "Create roles and edit permissions" },
  "audit:view": { group: "Admin", label: "View audit log" },
} as const;

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
  permissions: Permission[];
};

export function can(user: Pick<SessionUser, "permissions">, permission: Permission) {
  return user.permissions.includes(permission);
}

/** Users without `leads:view_all` only ever see leads (and their quotes/policies) assigned to them. */
export function seesOnlyOwnLeads(user: Pick<SessionUser, "permissions">) {
  return !can(user, "leads:view_all");
}
