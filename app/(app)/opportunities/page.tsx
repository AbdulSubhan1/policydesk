import { getTranslations } from "next-intl/server";
import {
  Badge,
  ButtonLink,
  Card,
  CellText,
  EmptyRow,
  FilterTabs,
  Forbidden,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { OPPORTUNITY_STATUSES, type OpportunityStatus } from "@/constants/statuses";
import { shortDate } from "@/lib/format";
import { can, scopeOf } from "@/lib/rbac";
import { requireUser } from "@/server/auth";
import { listOpportunities } from "@/server/queries/opportunities";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser();
  const scope = scopeOf(user, "opportunities");
  if (scope === "none") return <Forbidden permission="opportunities:view_own" />;

  const { filter } = await searchParams;
  const status = OPPORTUNITY_STATUSES.find((s) => s === filter) as OpportunityStatus | undefined;
  const [rows, t] = await Promise.all([listOpportunities(user, status), getTranslations()]);

  return (
    <>
      <PageHeader
        title={t("opportunities.title")}
        description={t("opportunities.description", { scope: t(`scope.${scope}`) })}
        action={
          can(user, "opportunities:create") && (
            <ButtonLink href="/opportunities/new" variant="primary">
              {t("opportunities.new")}
            </ButtonLink>
          )
        }
      />
      <FilterTabs base="/opportunities" values={OPPORTUNITY_STATUSES} current={status} />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t("opportunities.customer")}</Th>
              <Th>{t("opportunities.product")}</Th>
              <Th>{t("opportunities.status")}</Th>
              <Th>{t("opportunities.coordinator")}</Th>
              <Th>{t("opportunities.received")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={5}>{t("opportunities.empty")}</EmptyRow>}
            {rows.map((o) => (
              <Tr key={o.id}>
                <Td>
                  <CellText href={`/opportunities/${o.id}`} primary={o.customerName} secondary={o.email} />
                </Td>
                <Td>
                  <CellText primary={t(`products.${o.product}`)} secondary={t(`departments.${o.departmentKey}`)} />
                </Td>
                <Td>
                  <Badge status={o.status} />
                </Td>
                <Td className="text-ink-soft">{o.coordinatorName ?? t("common.unassigned")}</Td>
                <Td className="whitespace-nowrap text-muted">{shortDate(o.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
