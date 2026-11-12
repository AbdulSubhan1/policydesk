import { getTranslations } from "next-intl/server";
import {
  ActionBar,
  Avatar,
  Badge,
  Button,
  CellText,
  DataTable,
  DropdownMenu,
  Forbidden,
  Icon,
  PageHeader,
  type MenuItem,
} from "@/components/ui";
import { DEPARTMENTS, type DepartmentKey } from "@/constants/products";
import { EDITABLE_LEAD_STAGES, LEAD_STAGES, type KycStatus, type LeadStage } from "@/constants/statuses";
import { money, shortDate } from "@/lib/format";
import { keyedOptions } from "@/lib/options";
import { pageFrom } from "@/lib/pagination";
import { can, scopeOf } from "@/lib/rbac";
import type { SearchParams } from "@/lib/url";
import { leadPath } from "@/lib/reference";
import { updateLeads } from "@/server/actions/leads";
import { requireUser } from "@/server/auth";
import { assignableAdvisors, leadAdvisors, listLeads } from "@/server/queries/leads";

const BULK_FORM = "lead-bulk";

type Translate = Awaited<ReturnType<typeof getTranslations>>;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const scope = scopeOf(user, "leads");
  if (scope === "none") return <Forbidden permission="leads:view_own" />;

  const params = await searchParams;
  const stage = LEAD_STAGES.find((s) => s === params.filter) as LeadStage | undefined;
  const department = DEPARTMENTS.find((d) => d.key === params.department)?.key as DepartmentKey | undefined;
  const page = pageFrom(params);
  const bulk = can(user, "leads:edit");
  const bulkAssign = bulk && can(user, "leads:assign");
  // An advisor sees only their own leads, so filtering by advisor would narrow nothing
  const byAdvisor = scope !== "own";

  const [{ rows, total, all, stageCounts }, advisors, assignees, t] = await Promise.all([
    listLeads(user, {
      stage,
      q: params.q,
      advisor: byAdvisor ? params.advisor : undefined,
      department: scope === "all" ? department : undefined,
      paidOnline: params.paid === "1",
      page,
    }),
    byAdvisor ? leadAdvisors(user) : [],
    bulkAssign ? assignableAdvisors(user) : [],
    getTranslations(),
  ]);

  // Advisors grouped under their department, since a lead can only go to an advisor of its own department
  const assignItems: MenuItem[] = assignees.flatMap((a, i) => [
    ...(a.departmentKey !== assignees[i - 1]?.departmentKey
      ? [{ type: "label" as const, label: t(`departments.${a.departmentKey}`) }]
      : []),
    { label: a.name, form: BULK_FORM, name: "advisorId", value: String(a.id) },
  ]);

  return (
    <>
      <PageHeader title={t("leads.title")} description={t("leads.description", { scope: t(`scope.${scope}`) })} />
      {bulk && (
        <form id={BULK_FORM} action={updateLeads}>
          <ActionBar form={BULK_FORM} name="leadIds">
            <DropdownMenu
              side="top"
              label={t("leads.bulk.setStage")}
              trigger={
                <Button type="button" size="sm" variant="ghost">
                  <Icon name="edit" size={15} />
                  {t("leads.bulk.setStage")}
                </Button>
              }
              items={EDITABLE_LEAD_STAGES.map((s) => ({
                label: t(`status.${s}`),
                form: BULK_FORM,
                name: "stage",
                value: s,
              }))}
            />
            {assignItems.length > 0 && (
              <DropdownMenu
                side="top"
                label={t("leads.bulk.assign")}
                trigger={
                  <Button type="button" size="sm" variant="ghost">
                    <Icon name="users" size={15} />
                    {t("leads.bulk.assign")}
                  </Button>
                }
                items={assignItems}
              />
            )}
          </ActionBar>
        </form>
      )}
      <DataTable
        select={bulk ? { form: BULK_FORM, name: "leadIds", label: (l) => l.customerName } : undefined}
        path="/leads"
        params={params}
        rows={rows}
        rowKey={(l) => l.id}
        rowHref={(l) => leadPath(l.publicId)}
        search={{ placeholder: t("leads.search") }}
        filters={{
          label: t("leads.stage"),
          variant: "tabs",
          total: all,
          options: keyedOptions(t, "status", LEAD_STAGES).map((o) => ({
            ...o,
            count: stageCounts[o.value as LeadStage] ?? 0,
          })),
        }}
        refine={{
          selects: [
            ...(byAdvisor
              ? [
                  {
                    name: "advisor",
                    label: t("leads.advisor"),
                    placeholder: t("leads.anyAdvisor"),
                    options: [
                      { value: "none", label: t("leads.noAdvisor") },
                      ...advisors.map((a) => ({ value: String(a.id), label: a.name })),
                    ],
                  },
                ]
              : []),
            ...(scope === "all"
              ? [
                  {
                    name: "department",
                    label: t("leads.department"),
                    placeholder: t("leads.allDepartments"),
                    options: keyedOptions(
                      t,
                      "departments",
                      DEPARTMENTS.map((d) => d.key),
                    ),
                  },
                ]
              : []),
          ],
          toggles: [{ name: "paid", label: t("leads.paidOnlineOnly") }],
        }}
        pagination={{ page: page.page, pageSize: page.limit, total }}
        empty={{ title: t("leads.empty"), icon: "clipboard" }}
        mobile="rows"
        summary={(l) => ({
          title: l.customerName,
          amount: <Premium premium={l.premium} lost={l.stage === "lost"} t={t} />,
          meta: [
            <span key="ref" className="font-mono text-xs">
              {l.reference}
            </span>,
            t(`products.${l.product}`),
            l.advisorName,
          ],
          badges: (
            <>
              <StageBadges lead={l} t={t} />
              {!l.advisorName && <Badge tone="red">{t("leads.noAdvisor")}</Badge>}
            </>
          ),
          date: shortDate(l.updatedAt),
        })}
        columns={[
          {
            key: "customer",
            header: t("leads.customer"),
            cell: (l) => <CellText href={leadPath(l.publicId)} primary={l.customerName} secondary={l.reference} />,
          },
          {
            key: "product",
            header: t("leads.product"),
            priority: 2,
            cell: (l) => (
              <CellText
                primary={t(`products.${l.product}`)}
                secondary={l.type === "renewal" ? t("status.renewal") : t(`departments.${l.departmentKey}`)}
              />
            ),
          },
          { key: "stage", header: t("leads.stage"), cell: (l) => <StageBadges lead={l} t={t} /> },
          {
            key: "premium",
            header: t("leads.premium"),
            numeric: true,
            cell: (l) => <Premium premium={l.premium} lost={l.stage === "lost"} t={t} />,
          },
          {
            key: "advisor",
            header: t("leads.advisor"),
            cell: (l) =>
              l.advisorName ? (
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={l.advisorName} size="sm" />
                  <span className="truncate">{l.advisorName}</span>
                </span>
              ) : (
                <Badge tone="red">{t("leads.noAdvisor")}</Badge>
              ),
          },
          {
            key: "updated",
            header: t("leads.updated"),
            nowrap: true,
            priority: 2,
            cell: (l) => <span className="text-muted">{shortDate(l.updatedAt)}</span>,
          },
        ]}
      />
    </>
  );
}

/** The quote's premium; muted once the lead is lost, "Not quoted" before the first quote. */
function Premium({ premium, lost, t }: { premium: number | null; lost: boolean; t: Translate }) {
  if (premium === null) return <span className="font-normal text-muted">{t("leads.notQuoted")}</span>;
  return <span className={lost ? "font-normal text-muted" : "font-medium"}>{money(premium)}</span>;
}

/** The stage (with the KYC progress while at the KYC stage) and a paid website order. */
function StageBadges({
  lead,
  t,
}: {
  lead: { stage: LeadStage; kycStatus: KycStatus | null; paidOnline: boolean };
  t: Translate;
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {lead.stage === "kyc" && lead.kycStatus ? (
        <Badge status={lead.kycStatus === "submitted" ? "kyc" : lead.kycStatus}>
          {t(`leads.kycState.${lead.kycStatus}`)}
        </Badge>
      ) : (
        <Badge status={lead.stage} />
      )}
      {lead.paidOnline && <Badge tone="green">{t("leads.paidOnline")}</Badge>}
    </span>
  );
}
