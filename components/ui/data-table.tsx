import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { withParams, type SearchParams } from "@/lib/url";
import { ButtonLink } from "./button-link";
import { Checkbox } from "./checkbox";
import { EmptyState } from "./empty-state";
import { Icon, type IconName } from "./icon";
import { Input } from "./input";
import { PillNav } from "./pill-nav";
import { surface } from "./styles";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "start" | "end" | "center";
  /** Keep the cell on one line, e.g. dates and amounts. */
  nowrap?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  /** The page the table lives on; filters, search and pages link back to it. */
  path: string;
  /** The current query, so changing one control keeps the others. */
  params?: SearchParams;
  /** Free-text search through ?q=. */
  search?: { placeholder: string };
  /** Pill filters through ?filter=. */
  filters?: { label: string; options: { value: string; label: string }[] };
  pagination?: { page: number; pageSize: number; total: number };
  empty: { title: string; description?: React.ReactNode; icon?: IconName; action?: React.ReactNode };
  /** Below this width the table scrolls sideways instead of squashing. */
  minWidth?: "sm" | "md" | "lg";
  /** Inside a flush Panel: no border of its own. */
  embedded?: boolean;
  /** Row checkboxes that belong to the form `form` (by id) under `name`; pair with ActionBar. */
  select?: { form: string; name: string; label: (row: T) => string };
};

const MIN_WIDTH = { sm: "min-w-[560px]", md: "min-w-[720px]", lg: "min-w-[880px]" } as const;
const ALIGN = { start: "text-start", end: "text-end", center: "text-center" } as const;

/** Every list in the app: columns, search, filters, pagination and an empty state in one component. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  path,
  params = {},
  search,
  filters,
  pagination,
  empty,
  minWidth = "md",
  embedded,
  select,
}: Props<T>) {
  const t = useTranslations("table");
  const pages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div data-ui="DataTable" className="grid min-w-0 gap-3">
      {(search || filters) && (
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {filters && (
            <PillNav
              label={filters.label}
              items={[
                {
                  href: withParams(path, params, { filter: undefined, page: undefined }),
                  label: t("all"),
                  active: !params.filter,
                },
                ...filters.options.map((o) => ({
                  href: withParams(path, params, { filter: o.value, page: undefined }),
                  label: o.label,
                  active: params.filter === o.value,
                })),
              ]}
            />
          )}
          {search && (
            // A GET form: searching is just a URL, so results can be shared and the back button works
            <form action={path} className="relative w-full md:w-72">
              {params.filter && <input type="hidden" name="filter" value={params.filter} />}
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder={search.placeholder}
                aria-label={search.placeholder}
                className="ps-9"
              />
            </form>
          )}
        </div>
      )}

      <div className={embedded ? undefined : surface}>
        {rows.length === 0 ? (
          <EmptyState {...empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className={cn("w-full text-sm", MIN_WIDTH[minWidth])}>
              <thead>
                <tr>
                  {select && (
                    <th scope="col" className="w-10 border-b border-line ps-4">
                      <span className="sr-only">{t("select")}</span>
                    </th>
                  )}
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={cn(
                        "border-b border-line px-4 py-2.5 text-xs font-medium whitespace-nowrap text-muted",
                        ALIGN[c.align ?? "start"],
                      )}
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className="hover:bg-paper/60 has-checked:bg-brand-soft/50 [&:last-child>td]:border-b-0"
                  >
                    {select && (
                      <td className="border-b border-line ps-4 align-middle">
                        <Checkbox
                          form={select.form}
                          name={select.name}
                          value={rowKey(row)}
                          label={select.label(row)}
                          hideLabel
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "border-b border-line px-4 py-3 align-middle",
                          ALIGN[c.align ?? "start"],
                          c.nowrap && "whitespace-nowrap",
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
            <span>
              {t("showing", {
                from: (pagination.page - 1) * pagination.pageSize + 1,
                to: Math.min(pagination.page * pagination.pageSize, pagination.total),
                total: pagination.total,
              })}
            </span>
            {pages > 1 && (
              <nav className="flex items-center gap-1" aria-label={t("pages")}>
                <PageLink
                  path={path}
                  params={params}
                  page={pagination.page - 1}
                  disabled={pagination.page <= 1}
                  label={t("previous")}
                  icon="chevronStart"
                />
                <span className="px-2 tabular-nums">{t("pageOf", { page: pagination.page, pages })}</span>
                <PageLink
                  path={path}
                  params={params}
                  page={pagination.page + 1}
                  disabled={pagination.page >= pages}
                  label={t("next")}
                  icon="chevronEnd"
                />
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PageLink({
  path,
  params,
  page,
  disabled,
  label,
  icon,
}: {
  path: string;
  params: SearchParams;
  page: number;
  disabled: boolean;
  label: string;
  icon: IconName;
}) {
  const content = <Icon name={icon} size={16} className="rtl:rotate-180" />;
  return disabled ? (
    <span aria-disabled className="grid h-8 w-8 place-items-center rounded-lg text-muted/40" aria-label={label}>
      {content}
    </span>
  ) : (
    <ButtonLink
      size="sm"
      href={withParams(path, params, { page: String(page) })}
      aria-label={label}
      className="w-8 px-0"
    >
      {content}
    </ButtonLink>
  );
}
