import { getTranslations } from "next-intl/server";
import { Badge, Card, CellText, EmptyRow, FilterTabs, Forbidden, PageHeader, Table, Td, Th, Tr } from "@/components/ui";
import { LEAD_STAGES, type LeadStage } from "@/constants/statuses";
import { shortDate } from "@/lib/format";
import { scopeOf } from "@/lib/rbac";
import { requireUser } from "@/server/auth";
import { listLeads } from "@/server/queries/leads";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser();
  const scope = scopeOf(user, "leads");
  if (scope === "none") return <Forbidden permission="leads:view_own" />;

  const { filter } = await searchParams;
  const stage = LEAD_STAGES.find((s) => s === filter) as LeadStage | undefined;
  const [rows, t] = await Promise.all([listLeads(user, stage), getTranslations()]);

  return (
    <>
      <PageHeader title={t("leads.title")} description={t("leads.description", { scope: t(`scope.${scope}`) })} />
      <FilterTabs base="/leads" values={LEAD_STAGES} current={stage} />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t("leads.customer")}</Th>
              <Th>{t("leads.product")}</Th>
              <Th>{t("leads.stage")}</Th>
              <Th>{t("leads.kyc")}</Th>
              <Th>{t("leads.advisor")}</Th>
              <Th>{t("leads.updated")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={6}>{t("leads.empty")}</EmptyRow>}
            {rows.map((l) => (
              <Tr key={l.id}>
                <Td>
                  <CellText
                    href={`/leads/${l.id}`}
                    primary={l.customerName}
                    secondary={t("leads.leadNumber", { id: l.id })}
                  />
                </Td>
                <Td>
                  <CellText
                    primary={t(`products.${l.product}`)}
                    secondary={l.type === "renewal" ? t("status.renewal") : t(`departments.${l.departmentKey}`)}
                  />
                </Td>
                <Td>
                  <Badge status={l.stage} />
                </Td>
                <Td>{l.kycStatus && <Badge status={l.kycStatus} />}</Td>
                <Td className="text-ink-soft">{l.advisorName ?? t("common.unassigned")}</Td>
                <Td className="whitespace-nowrap text-muted">{shortDate(l.updatedAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
