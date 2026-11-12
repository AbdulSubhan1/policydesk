import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { withParams, type SearchParams } from "@/lib/url";
import { ButtonLink } from "./button-link";
import { Checkbox } from "./checkbox";
import { EmptyState } from "./empty-state";
import { Icon, type IconName } from "./icon";
import { Input } from "./input";
import { ListRow } from "./list-row";
import { PillNav } from "./pill-nav";
import { surface } from "./styles";
import { TableFilters, type TableSelect, type TableToggle } from "./table-filters";
import { Tabs } from "./tabs";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "start" | "end" | "center";
  /** Keep the cell on one line, e.g. dates and amounts. */
  nowrap?: boolean;
  /** Amounts: end-aligned tabular figures on one line, so the digits line up down the column. */
  numeric?: boolean;
  /**
   * 1 (default) always shows. 2 hides while the table is narrower than 56rem, 3 while it is narrower than 64rem,
   * so on a laptop or tablet the least useful columns give way first instead of the table scrolling sideways.
   */
  priority?: 1 | 2 | 3;
};

/** A row as a stacked card on phones (`mobile="rows"`). */
export type RowSummary = {
  /** First line, start: usually the customer. */
  title: React.ReactNode;
  /** First line, end: the amount. */
  amount?: React.ReactNode;
  /** Second line, joined with " · ": reference, product, person. Empty values are skipped. */
  meta?: React.ReactNode[];
  /** Third line, start: status badges. */
  badges?: React.ReactNode;
  /** Third line, end: the date. */
  date?: React.ReactNode;
};

type FilterOption = { value: string; label: string; count?: number };

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
  /**
   * One-of filters through ?filter=. "pills" (default) sits beside the search; "tabs" is a tab strip above it with
   * the count of each option (`count` on the options, `total` on All).
   */
  filters?: { label: string; options: FilterOption[]; variant?: "pills" | "tabs"; total?: number };
  /** Dropdown and on/off filters beside the search, each its own URL parameter. They apply as soon as they change. */
  refine?: { selects?: TableSelect[]; toggles?: TableToggle[] };
  pagination?: { page: number; pageSize: number; total: number };
  empty: { title: string; description?: React.ReactNode; icon?: IconName; action?: React.ReactNode };
  /** Below this width the table scrolls sideways instead of squashing. */
  minWidth?: "sm" | "md" | "lg";
  /** Inside a flush Panel: no border of its own. */
  embedded?: boolean;
  /** Row checkboxes that belong to the form `form` (by id) under `name`; pair with ActionBar. */
  select?: { form: string; name: string; label: (row: T) => string };
  /**
   * The whole row opens this link on click or tap. The row should still hold a real link (e.g. CellText href) for
   * keyboard and screen reader users; the row-wide one is hidden from them so links are not announced twice.
   */
  rowHref?: (row: T) => string;
} & (
  | { mobile?: undefined; summary?: undefined }
  /** "rows": on phones (narrower than 42rem) each row is a stacked ListRow built from `summary`. */
  | { mobile: "rows"; summary: (row: T) => RowSummary }
);

const MIN_WIDTH = { sm: "min-w-[560px]", md: "min-w-[720px]", lg: "min-w-[880px]" } as const;
const ALIGN = { start: "text-start", end: "text-end", center: "text-center" } as const;
// Container queries: the table's own width decides, so a sidebar or a half-width panel counts too
const PRIORITY = { 1: undefined, 2: "hidden @4xl:table-cell", 3: "hidden @5xl:table-cell" } as const;
// Buttons, checkboxes and links inside a linked row stay clickable above the row-wide link
const ABOVE_ROW_LINK =
  "[&_:is(a,button,input,label,summary):not([data-row-link])]:relative [&_:is(a,button,input,label,summary):not([data-row-link])]:z-10";

/** Every list in the app: columns, search, filters, pagination and an empty state in one component. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  path,
  params = {},
  search,
  filters,
  refine,
  pagination,
  empty,
  minWidth = "md",
  embedded,
  select,
  rowHref,
  mobile,
  summary,
}: Props<T>) {
  const t = useTranslations("table");
  const pages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;
  const tabs = filters?.variant === "tabs";
  const pills = filters && !tabs;
  const hasRefine = !!(refine?.selects?.length || refine?.toggles?.length);
  const filterHref = (value?: string) => withParams(path, params, { filter: value, page: undefined });

  return (
    <div data-ui="DataTable" className="@container grid min-w-0 gap-3">
      {tabs && (
        <Tabs
          label={filters.label}
          current={params.filter ?? ""}
          tabs={[
            { id: "", label: t("all"), href: filterHref(undefined), count: filters.total },
            ...filters.options.map((o) => ({ id: o.value, label: o.label, href: filterHref(o.value), count: o.count })),
          ]}
        />
      )}

      {(search || pills || hasRefine) && (
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
          {pills && (
            <PillNav
              label={filters.label}
              items={[
                { href: filterHref(undefined), label: t("all"), active: !params.filter },
                ...filters.options.map((o) => ({
                  href: filterHref(o.value),
                  label: o.count === undefined ? o.label : `${o.label} ${o.count}`,
                  active: params.filter === o.value,
                })),
              ]}
            />
          )}
          {search && (
            // A GET form: searching is just a URL, so results can be shared and the back button works
            <form action={path} className={cn("relative w-full", hasRefine ? "md:max-w-80 md:flex-1" : "md:w-72")}>
              {Object.entries(params).map(
                ([key, value]) =>
                  value && key !== "q" && key !== "page" && <input key={key} type="hidden" name={key} value={value} />,
              )}
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
          {hasRefine && <TableFilters path={path} params={params} selects={refine.selects} toggles={refine.toggles} />}
        </div>
      )}

      <div className={embedded ? undefined : surface}>
        {rows.length === 0 ? (
          <EmptyState {...empty} />
        ) : (
          <>
            {mobile === "rows" && (
              <ul className="@2xl:hidden">
                {rows.map((row) => (
                  <ListRow key={rowKey(row)} href={rowHref?.(row)}>
                    <Summary {...summary(row)} />
                  </ListRow>
                ))}
              </ul>
            )}
            <div className={cn("overflow-x-auto", mobile === "rows" && "hidden @2xl:block")}>
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
                          ALIGN[c.align ?? (c.numeric ? "end" : "start")],
                          PRIORITY[c.priority ?? 1],
                        )}
                      >
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const href = rowHref?.(row);
                    return (
                      <tr
                        key={rowKey(row)}
                        className={cn(
                          "hover:bg-paper/60 has-checked:bg-brand-soft/50 [&:last-child>td]:border-b-0",
                          href && cn("relative", ABOVE_ROW_LINK),
                        )}
                      >
                        {select && (
                          <td className="relative z-10 border-b border-line ps-4 align-middle">
                            <Checkbox
                              form={select.form}
                              name={select.name}
                              value={rowKey(row)}
                              label={select.label(row)}
                              hideLabel
                            />
                          </td>
                        )}
                        {columns.map((c, i) => (
                          <td
                            key={c.key}
                            className={cn(
                              "border-b border-line px-4 py-3 align-middle",
                              ALIGN[c.align ?? (c.numeric ? "end" : "start")],
                              (c.nowrap || c.numeric) && "whitespace-nowrap",
                              c.numeric && "tabular-nums",
                              PRIORITY[c.priority ?? 1],
                            )}
                          >
                            {/* Positioned against the row, so it covers every cell behind the content */}
                            {href && i === 0 && (
                              <Link
                                href={href}
                                data-row-link
                                tabIndex={-1}
                                aria-hidden
                                className="absolute inset-0 focus:outline-none"
                              />
                            )}
                            {c.cell(row)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
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

/** The three lines of a phone row: title and amount, meta, then badges and date. */
function Summary({ title, amount, meta, badges, date }: RowSummary) {
  const parts = meta?.filter((m) => m !== null && m !== undefined && m !== false && m !== "");
  return (
    <span className="grid min-w-0 gap-1 text-sm">
      <span className="flex min-w-0 items-baseline justify-between gap-3">
        <span className="truncate font-semibold text-ink">{title}</span>
        {amount !== undefined && (
          <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums">{amount}</span>
        )}
      </span>
      {parts && parts.length > 0 && (
        <span className="truncate text-muted">
          {parts.map((part, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {part}
            </span>
          ))}
        </span>
      )}
      {(badges || date) && (
        <span className="mt-1 flex min-w-0 items-center gap-1.5">
          <span className="flex min-w-0 flex-wrap gap-1.5">{badges}</span>
          {date && <span className="ms-auto shrink-0 text-muted">{date}</span>}
        </span>
      )}
    </span>
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
