import { NavLink } from "@/components/nav-link";
import { requireUser } from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";
import { logout } from "../login/actions";

const NAV: { href: string; label: string; anyOf: Permission[] }[] = [
  { href: "/", label: "Dashboard", anyOf: ["dashboard:view"] },
  { href: "/leads", label: "Leads", anyOf: ["leads:view_all", "leads:view_own"] },
  { href: "/policies", label: "Policies", anyOf: ["policies:view"] },
  { href: "/admin/users", label: "Users", anyOf: ["users:manage"] },
  { href: "/admin/roles", label: "Roles & permissions", anyOf: ["roles:manage"] },
  { href: "/audit", label: "Audit log", anyOf: ["audit:view"] },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = NAV.filter((item) => item.anyOf.some((p) => can(user, p)));

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-r md:border-b-0">
        <div className="flex items-center gap-2 px-4 py-4 md:px-5 md:py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            P
          </div>
          <span className="font-semibold text-slate-900">PolicyDesk</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
          {links.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-slate-200 p-4 md:block">
          <p className="text-sm font-medium text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
          <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {user.roleName}
          </span>
          <form action={logout} className="mt-3">
            <button className="btn-secondary w-full">Switch account</button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-xs text-indigo-800 md:px-8">
          <span>
            Demo mode: you are signed in as <b>{user.roleName}</b>. Menus, buttons and data change with each role&apos;s
            permissions.
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
