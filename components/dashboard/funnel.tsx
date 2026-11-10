import Link from "next/link";
import { useTranslations } from "next-intl";
import { Panel, ProgressBar } from "@/components/ui";

/** Counts per status with a bar each; every row links to the filtered list. */
export function Funnel({
  title,
  href,
  steps,
  counts,
}: {
  title: string;
  href: string;
  steps: readonly string[];
  counts: Partial<Record<string, number>>;
}) {
  const t = useTranslations();
  const total = steps.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  return (
    <Panel title={title} description={t("dashboard.inTotal", { count: total })}>
      <ul className="grid gap-3">
        {steps.map((s) => (
          <li key={s}>
            <Link
              href={`${href}?filter=${s}`}
              className="grid grid-cols-[minmax(0,8rem)_1fr_2rem] items-center gap-3 text-sm hover:text-brand"
            >
              <span className="truncate">{t(`status.${s}`)}</span>
              <ProgressBar value={counts[s] ?? 0} total={total} />
              <span className="text-end font-medium">{counts[s] ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
