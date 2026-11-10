import { useTranslations } from "next-intl";
import { PillNav } from "./pill-nav";

/** Status filter for a list, through ?filter=. Labels come from messages ("status.<value>"). */
export function FilterTabs({ base, values, current }: { base: string; values: readonly string[]; current?: string }) {
  const t = useTranslations();
  return (
    <PillNav
      label={t("common.all")}
      items={[
        { href: base, label: t("common.all"), active: !current },
        ...values.map((value) => ({
          href: `${base}?filter=${value}`,
          label: t(`status.${value}`),
          active: value === current,
        })),
      ]}
    />
  );
}
