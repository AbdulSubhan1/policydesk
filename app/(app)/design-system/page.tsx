import { getTranslations } from "next-intl/server";
import { Preview } from "@/components/design-system/previews";
import { Badge, PageHeader, Panel, PillNav } from "@/components/ui";
import { UI_REGISTRY } from "@/components/ui/registry";
import usage from "@/components/ui/usage.json";
import { withParams, type SearchParams } from "@/lib/url";
import { requireUser } from "@/server/auth";

// Token names as defined in app/globals.css (@theme). Swatches use the real classes.
const COLORS = [
  { token: "ink", className: "bg-ink" },
  { token: "ink-soft", className: "bg-ink-soft" },
  { token: "muted", className: "bg-muted" },
  { token: "paper", className: "bg-paper" },
  { token: "line", className: "bg-line" },
  { token: "brand", className: "bg-brand" },
  { token: "brand-soft", className: "bg-brand-soft" },
  { token: "info", className: "bg-info" },
  { token: "warn", className: "bg-warn" },
  { token: "risk", className: "bg-risk" },
  { token: "plum", className: "bg-plum" },
];
const GROUPS = [...new Set(UI_REGISTRY.map((c) => c.group))];

export default async function DesignSystemPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const [params, t] = await Promise.all([searchParams, getTranslations("designSystem")]);
  const group = GROUPS.find((g) => g === params.group);
  const entries = UI_REGISTRY.filter((c) => !group || c.group === group);
  const usedIn = usage as Record<string, string[]>;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title={t("colors")} description="app/globals.css">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {COLORS.map((c) => (
              <div key={c.token} className="min-w-0">
                <div className={`h-10 rounded-md border border-line ${c.className}`} />
                <p className="mt-1 truncate font-mono text-xs text-ink-soft">{c.token}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={t("typography")} description="Hanken Grotesk, IBM Plex Sans Arabic, IBM Plex Mono">
          <div className="grid gap-2">
            <p className="text-2xl font-semibold tracking-tight">{t("sampleHeading")}</p>
            <p className="text-sm text-ink-soft">{t("sampleBody")}</p>
            <p lang="ar" dir="rtl" className="text-sm text-ink-soft">
              تغطية شاملة للسيارة مع إصلاح لدى الوكالة
            </p>
            <p className="font-mono text-sm">PD-2026-00034</p>
          </div>
        </Panel>
      </div>

      <PillNav
        label={t("title")}
        items={[
          { href: "/design-system", label: t("all"), active: !group },
          ...GROUPS.map((g) => ({
            href: withParams("/design-system", {}, { group: g }),
            label: g,
            active: g === group,
          })),
        ]}
      />

      <div className="grid gap-6">
        {entries.map((entry) => (
          <Panel
            key={entry.name}
            id={entry.name}
            title={entry.name}
            description={entry.description}
            actions={<Badge tone="grey">{entry.group}</Badge>}
            className="scroll-mt-6"
          >
            <div className="grid gap-5">
              <div className="min-w-0 rounded-lg border border-dashed border-line bg-paper/40 p-4 empty:hidden">
                <Preview name={entry.name} params={params} />
              </div>
              <dl className="grid min-w-0 grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-xs text-muted">{t("file")}</dt>
                  <dd className="font-mono text-xs">components/ui/{entry.file}</dd>
                  <dt className="mt-3 text-xs text-muted">{t("props")}</dt>
                  <dd className="font-mono text-xs [overflow-wrap:anywhere]">{entry.props}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-muted">{t("usage")}</dt>
                  <dd>
                    <pre className="overflow-x-auto rounded-md bg-ink px-3 py-2 font-mono text-xs text-white">
                      <code>{entry.example}</code>
                    </pre>
                  </dd>
                  <dt className="mt-3 text-xs text-muted">{t("usedIn", { count: usedIn[entry.name]?.length ?? 0 })}</dt>
                  <dd className="font-mono text-xs text-ink-soft">
                    {(usedIn[entry.name] ?? []).map((path) => (
                      <span key={path} className="block truncate">
                        {path}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
