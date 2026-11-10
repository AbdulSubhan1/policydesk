import type { IconName } from "@/components/ui";
import type { Permission } from "@/lib/rbac";

export type NavItem = { href: string; labelKey: string; icon: IconName; anyOf: Permission[] };

// The sidebar. An item shows when the user has any of its permissions; labels are messages under "nav".
export const NAVIGATION: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "nav.main",
    items: [
      { href: "/", labelKey: "nav.dashboard", icon: "dashboard", anyOf: ["dashboard:view"] },
      {
        href: "/opportunities",
        labelKey: "nav.opportunities",
        icon: "inbox",
        anyOf: ["opportunities:view_all", "opportunities:view_department", "opportunities:view_own"],
      },
      {
        href: "/leads",
        labelKey: "nav.leads",
        icon: "clipboard",
        anyOf: ["leads:view_all", "leads:view_department", "leads:view_own"],
      },
      { href: "/kyc", labelKey: "nav.kyc", icon: "badgeCheck", anyOf: ["kyc:review"] },
      { href: "/policies", labelKey: "nav.policies", icon: "shield", anyOf: ["policies:view"] },
    ],
  },
  {
    titleKey: "nav.settings",
    items: [
      { href: "/admin/plans", labelKey: "nav.plans", icon: "package", anyOf: ["plans:manage"] },
      { href: "/admin/documents", labelKey: "nav.documents", icon: "fileSettings", anyOf: ["documents:configure"] },
      { href: "/admin/users", labelKey: "nav.users", icon: "users", anyOf: ["users:manage"] },
      { href: "/admin/roles", labelKey: "nav.roles", icon: "key", anyOf: ["roles:manage"] },
      { href: "/audit", labelKey: "nav.audit", icon: "scroll", anyOf: ["audit:view"] },
    ],
  },
  {
    titleKey: "nav.reference",
    items: [
      { href: "/design-system", labelKey: "nav.designSystem", icon: "palette", anyOf: ["dashboard:view"] },
      { href: "/kb", labelKey: "nav.kb", icon: "book", anyOf: ["dashboard:view"] },
    ],
  },
];
