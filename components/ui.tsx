import type { Permission } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/rbac";

const BADGE_COLORS: Record<string, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200",
  contacted: "bg-amber-50 text-amber-700 ring-amber-200",
  quoted: "bg-violet-50 text-violet-700 ring-violet-200",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-slate-100 text-slate-600 ring-slate-200",
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  sent: "bg-sky-50 text-sky-700 ring-sky-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        BADGE_COLORS[value] ?? "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {value}
    </span>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Forbidden({ permission }: { permission: Permission }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <p className="text-4xl">🔒</p>
      <h1 className="mt-3 text-lg font-semibold text-slate-900">You don&apos;t have access to this page</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your role is missing the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{permission}</code>{" "}
        permission ({PERMISSIONS[permission].label.toLowerCase()}). An admin can grant it under Roles.
      </p>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        {children}
      </td>
    </tr>
  );
}
