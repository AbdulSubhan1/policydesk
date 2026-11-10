import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Demos } from "@/components/design-system/demos";
import { Badge, ButtonLink, DataTable, Icon, PageHeader, Panel, PillNav } from "@/components/ui";
import { UI_REGISTRY } from "@/components/ui/registry";
import usage from "@/components/ui/usage.json";
import { cn } from "@/lib/cn";
import { withParams, type SearchParams } from "@/lib/url";

// Preview widths: check a component at phone and tablet size without resizing the window
const FRAMES = { full: "", tablet: "max-w-3xl", mobile: "max-w-[375px]" } as const;
type Frame = keyof typeof FRAMES;

export default async function ComponentPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ name }, query, t] = await Promise.all([params, searchParams, getTranslations("designSystem")]);
  const index = UI_REGISTRY.findIndex((c) => c.name === name);
  if (index < 0) notFound();

  const entry = UI_REGISTRY[index];
  const path = `/design-system/${entry.name}`;
  const frame: Frame = query.w === "tablet" || query.w === "mobile" ? query.w : "full";
  const usedIn = (usage as Record<string, string[]>)[entry.name] ?? [];
  const previous = UI_REGISTRY[index - 1];
  const next = UI_REGISTRY[index + 1];

  return (
    <>
      <PageHeader
        back={{ href: "/design-system", label: t("library") }}
        title={entry.name}
        description={entry.description}
        action={<Badge tone="grey">{entry.group}</Badge>}
      />

      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 className="mb-4 font-semibold">{t("examples")}</h2>
        <PillNav
          label={t("width")}
          items={(Object.keys(FRAMES) as Frame[]).map((w) => ({
            href: withParams(path, query, { w: w === "full" ? undefined : w }),
            label: t(`widths.${w}`),
            active: frame === w,
          }))}
        />
      </div>
      <Panel flush className={cn("mx-auto w-full", FRAMES[frame])}>
        <Demos name={entry.name} path={path} params={query} />
      </Panel>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title={t("code")} description={`components/ui/${entry.file}`}>
          <pre className="overflow-x-auto rounded-md bg-ink px-4 py-3 font-mono text-xs leading-relaxed text-white">
            <code>{entry.example}</code>
          </pre>
        </Panel>
        <Panel title={t("props")}>
          <ul className="grid gap-1.5 font-mono text-xs">
            {entry.props.split("; ").map((prop) => (
              <li key={prop} className="[overflow-wrap:anywhere]">
                {prop}
              </li>
            ))}
          </ul>
        </Panel>
        {entry.keyboard && (
          <Panel title={t("keyboard")} flush>
            <DataTable
              embedded
              minWidth="sm"
              path={path}
              rows={entry.keyboard}
              rowKey={([keys]) => keys}
              empty={{ title: "" }}
              columns={[
                {
                  key: "keys",
                  header: t("keys"),
                  nowrap: true,
                  cell: ([keys]) => <kbd className="font-mono text-xs">{keys}</kbd>,
                },
                { key: "does", header: t("does"), cell: ([, does]) => does },
              ]}
            />
          </Panel>
        )}
        <Panel title={t("usedIn", { count: usedIn.length })}>
          <ul className="grid gap-1 font-mono text-xs text-ink-soft">
            {usedIn.map((file) => (
              <li key={file} className="truncate">
                {file}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <nav className="mt-8 flex justify-between gap-3" aria-label={t("library")}>
        {previous ? (
          <ButtonLink href={`/design-system/${previous.name}`}>
            <Icon name="chevronStart" size={15} className="rtl:rotate-180" />
            {previous.name}
          </ButtonLink>
        ) : (
          <span />
        )}
        {next && (
          <ButtonLink href={`/design-system/${next.name}`}>
            {next.name}
            <Icon name="chevronEnd" size={15} className="rtl:rotate-180" />
          </ButtonLink>
        )}
      </nav>
    </>
  );
}
