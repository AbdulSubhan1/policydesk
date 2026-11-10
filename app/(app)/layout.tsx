import { NavLink } from "@/components/nav-link";
import { requireUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";
import { logout } from "../login/actions";

const NAV: { section?: string; href: string; label: string; anyOf: Permission[] }[] = [
  { href: "/", label: "Dashboard", anyOf: ["dashboard:view"] },
  { href: "/opportunities", label: "Opportunities", anyOf: ["opportunities:view_all", "opportunities:view_department", "opportunities:view_own"] },
  { href: "/leads", label: "Leads", anyOf: ["leads:view_all", "leads:view_department", "leads:view_own"] },
  { href: "/kyc", label: "KYC review", anyOf: ["kyc:review"] },
  { href: "/policies", label: "Policies & payments", anyOf: ["policies:view"] },
  { section: "Settings", href: "/admin/plans", label: "Insurers & plans", anyOf: ["plans:manage"] },
  { href: "/admin/documents", label: "Document settings", anyOf: ["documents:configure"] },
  { href: "/admin/users", label: "Users", anyOf: ["users:manage"] },
  { href: "/admin/roles", label: "Roles & permissions", anyOf: ["roles:manage"] },
  { href: "/audit", label: "Audit log", anyOf: ["audit:view"] },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = NAV.filter((item) => item.anyOf.some((p) => can(user, p)));

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center gap-2 px-4 py-4 md:px-5 md:py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">P</div>
          <span className="font-semibold text-slate-900">PolicyDesk</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:pb-0">
          {links.map((item) => (
            <div key={item.href} className="contents">
              {item.section && (
                <p className="mt-4 hidden px-3 pb-1 text-xs font-medium tracking-wide text-slate-400 uppercase md:block">
                  {item.section}
                </p>
              )}
              <NavLink href={item.href}>{item.label}</NavLink>
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-slate-200 p-4 md:block">
          <p className="text-sm font-medium text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{user.roleName}</span>
            {user.departmentName && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{user.departmentName}</span>
            )}
          </div>
          <form action={logout} className="mt-3">
            <button className="btn-secondary w-full">Switch account</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-xs text-indigo-800 md:px-8">
          <span>
            Demo mode: signed in as <b>{user.roleName}</b>
            {user.departmentName && <> in <b>{user.departmentName}</b></>}. Menus, buttons and data follow this role&apos;s permissions.
          </span>
          <form action={logout} className="md:hidden">
            <button className="font-medium underline">Switch</button>
          </form>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
