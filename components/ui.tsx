import type { Permission } from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/rbac";

const GREEN = "bg-emerald-50 text-emerald-700 ring-emerald-200";
const BLUE = "bg-sky-50 text-sky-700 ring-sky-200";
const AMBER = "bg-amber-50 text-amber-700 ring-amber-200";
const VIOLET = "bg-violet-50 text-violet-700 ring-violet-200";
const RED = "bg-red-50 text-red-700 ring-red-200";
const GREY = "bg-slate-100 text-slate-600 ring-slate-200";

const BADGE_COLORS: Record<string, string> = {
  new: BLUE,
  contacted: AMBER,
  qualified: VIOLET,
  disqualified: GREY,
  converted: GREEN,
  needs_analysis: BLUE,
  quoted: VIOLET,
  kyc: AMBER,
  won: GREEN,
  lost: GREY,
  draft: GREY,
  sent: BLUE,
  accepted: GREEN,
  rejected: RED,
  booked: AMBER,
  active: GREEN,
  cancelled: RED,
  pending: AMBER,
  submitted: BLUE,
  approved: GREEN,
  paid: GREEN,
  failed: RED,
  refunded: GREY,
  low: GREEN,
  medium: AMBER,
  high: RED,
  new_business: BLUE,
  renewal: VIOLET,
};

export function label(value: string) {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `value` picks the colour; `text` replaces the label for flag-style badges. */
export function Badge({ value, prefix, text }: { value: string; prefix?: string; text?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${BADGE_COLORS[value] ?? GREY}`}
    >
      {text ?? `${prefix ?? ""}${label(value)}`}
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

export function FilterTabs({ base, values, current }: { base: string; values: readonly string[]; current?: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {[undefined, ...values].map((v) => (
        <a
          key={v ?? "all"}
          href={v ? `${base}?filter=${v}` : base}
          className={`rounded-full px-3 py-1 text-sm ${
            v === current ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {v ? label(v) : "All"}
        </a>
      ))}
    </div>
  );
}

export function Field({ label: text, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1 text-sm ${className}`}>
      <span className="font-medium text-slate-700">{text}</span>
      {children}
    </label>
  );
}
