import { getTranslations } from "next-intl/server";
import { Preview } from "@/components/design-system/previews";
import { Badge, Card, CardBody, CardHeader, PageHeader, PillNav } from "@/components/ui";
import { UI_REGISTRY } from "@/components/ui/registry";
import usage from "@/components/ui/usage.json";
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

export default async function DesignSystemPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  await requireUser();
  const t = await getTranslations("designSystem");
  const requested = (await searchParams).group;
  const group = GROUPS.find((g) => g === requested);
  const entries = UI_REGISTRY.filter((c) => !group || c.group === group);
  const usedIn = usage as Record<string, string[]>;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <Card className="mb-6">
        <CardHeader title={t("colors")} description="app/globals.css" />
        <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {COLORS.map((c) => (
            <div key={c.token} className="min-w-0">
              <div className={`h-12 rounded-md border border-line ${c.className}`} />
              <p className="mt-1 truncate font-mono text-xs text-ink-soft">{c.token}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader title={t("typography")} description="Hanken Grotesk, IBM Plex Sans Arabic, IBM Plex Mono" />
        <CardBody className="grid gap-2">
          <p className="text-2xl font-semibold tracking-tight">{t("sampleHeading")}</p>
          <p className="text-sm text-ink-soft">{t("sampleBody")}</p>
          <p lang="ar" dir="rtl" className="text-sm text-ink-soft">
            تغطية شاملة للسيارة مع إصلاح لدى الوكالة
          </p>
          <p className="font-mono text-sm">PD-2026-00034</p>
        </CardBody>
      </Card>

      <PillNav
        label={t("title")}
        items={[
          { href: "/design-system", label: "All", active: !group },
          ...GROUPS.map((g) => ({
            href: `/design-system?group=${encodeURIComponent(g)}`,
            label: g,
            active: g === group,
          })),
        ]}
      />

      <div className="grid gap-6">
        {entries.map((entry) => (
          <Card key={entry.name} id={entry.name} className="scroll-mt-6">
            <CardHeader
              title={entry.name}
              description={entry.description}
              action={<Badge tone="grey">{entry.group}</Badge>}
            />
            <CardBody className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="min-w-0 rounded-md border border-dashed border-line bg-paper/40 p-4">
                <Preview name={entry.name} />
              </div>
              <dl className="grid min-w-0 grid-cols-1 content-start gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">File</dt>
                  <dd className="font-mono text-xs">components/ui/{entry.file}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Props</dt>
                  <dd className="font-mono text-xs [overflow-wrap:anywhere]">{entry.props}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Usage</dt>
                  <dd>
                    <pre className="overflow-x-auto rounded-md bg-ink px-3 py-2 font-mono text-xs text-white">
                      <code>{entry.example}</code>
                    </pre>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Used in ({usedIn[entry.name]?.length ?? 0})</dt>
                  <dd className="font-mono text-xs text-ink-soft">
                    {(usedIn[entry.name] ?? []).map((path) => (
                      <span key={path} className="block truncate">
                        {path}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
