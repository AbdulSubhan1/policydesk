export const PERMISSIONS = {
  "dashboard:view": { group: "Dashboard", label: "View dashboard" },
  "opportunities:view_all": { group: "Opportunities", label: "View all opportunities" },
  "opportunities:view_department": { group: "Opportunities", label: "View opportunities in my department" },
  "opportunities:view_own": { group: "Opportunities", label: "View opportunities I coordinate" },
  "opportunities:create": { group: "Opportunities", label: "Create opportunities" },
  "opportunities:edit": { group: "Opportunities", label: "Qualify opportunities and change status" },
  "opportunities:assign": { group: "Opportunities", label: "Change an opportunity's coordinator" },
  "opportunities:convert": { group: "Opportunities", label: "Convert qualified opportunities into leads" },
  "leads:view_all": { group: "Leads", label: "View all leads" },
  "leads:view_department": { group: "Leads", label: "View leads in my department" },
  "leads:view_own": { group: "Leads", label: "View leads assigned to me" },
  "leads:edit": { group: "Leads", label: "Change lead stage" },
  "leads:assign": { group: "Leads", label: "Reassign leads to advisors" },
  "quotes:create": { group: "Quotes", label: "Create quotes" },
  "quotes:approve": { group: "Quotes", label: "Mark quotes accepted or rejected" },
  "kyc:submit": { group: "KYC / AML", label: "Collect and submit customer KYC" },
  "kyc:review": { group: "KYC / AML", label: "Approve or reject KYC (compliance)" },
  "policies:view": { group: "Policies", label: "View policies" },
  "policies:issue": { group: "Policies", label: "Issue policies (needs accepted quote + approved KYC)" },
  "policies:cancel": { group: "Policies", label: "Cancel policies" },
  "policies:renew": { group: "Policies", label: "Start renewals for expiring policies" },
  "payments:record": { group: "Policies", label: "Record payment status" },
  "documents:upload": { group: "Documents", label: "Upload customer documents" },
  "documents:download": { group: "Documents", label: "View and download customer documents" },
  "documents:configure": { group: "Documents", label: "Manage document types and what each product requires" },
  "plans:manage": { group: "Admin", label: "Manage insurers and their plans" },
  "users:manage": { group: "Admin", label: "Manage users, their roles and departments" },
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
  departmentId: number | null;
  departmentName: string | null;
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

export const SCOPE_LABEL: Record<Scope, string> = {
  all: "across all departments",
  department: "in your department",
  own: "assigned to you",
  none: "",
};
