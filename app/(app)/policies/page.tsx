import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Badge,
  Button,
  Card,
  CellText,
  EmptyRow,
  FilterTabs,
  Forbidden,
  Hidden,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { RENEWAL_WINDOW_DAYS } from "@/constants/config";
import { POLICY_FILTERS } from "@/constants/statuses";
import { cn } from "@/lib/cn";
import { money, shortDate } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { can, scopeOf } from "@/lib/rbac";
import { startRenewal } from "@/server/actions/policies";
import { requireUser } from "@/server/auth";
import { listPolicies } from "@/server/queries/policies";

const DAY = 86_400_000;

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser();
  if (!can(user, "policies:view")) return <Forbidden permission="policies:view" />;

  const { filter } = await searchParams;
  const [all, t, locale] = await Promise.all([listPolicies(user), getTranslations(), getLocale()]);
  const renewalDue = (p: (typeof all)[number]) =>
    p.status === "active" &&
    !p.renewedByLeadId &&
    new Date(p.endDate).getTime() - Date.now() < RENEWAL_WINDOW_DAYS * DAY;
  const rows = all.filter((p) => {
    if (filter === "unpaid") return p.paymentStatus === "pending" || p.paymentStatus === "failed";
    if (filter === "renewal_due") return renewalDue(p);
    return POLICY_FILTERS.includes(filter as never) ? p.status === filter : true;
  });
  const scope = scopeOf(user, "leads");

  return (
    <>
      <PageHeader
        title={t("policies.title")}
        description={t("policies.description", { scope: scope === "none" ? "" : t(`scope.${scope}`) })}
      />
      <FilterTabs base="/policies" values={POLICY_FILTERS} current={filter} />
      <Card>
        <Table size="lg">
          <thead>
            <tr>
              <Th>{t("policies.policy")}</Th>
              <Th>{t("policies.customer")}</Th>
              <Th>{t("policies.insurer")}</Th>
              <Th>{t("policies.premium")}</Th>
              <Th>{t("policies.ends")}</Th>
              <Th>{t("policies.status")}</Th>
              <Th>{t("policies.payment")}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={8}>{t("policies.empty")}</EmptyRow>}
            {rows.map((p) => (
              <Tr key={p.id}>
                <Td className="font-mono text-xs whitespace-nowrap text-ink-soft">{p.policyNumber}</Td>
                <Td>
                  <CellText
                    href={`/leads/${p.leadId}?tab=policy`}
                    primary={p.customerName}
                    secondary={`${t(`products.${p.product}`)}, ${p.advisorName ?? t("policies.noAdvisor")}`}
                  />
                </Td>
                <Td>
                  <CellText primary={p.insurer} secondary={localized(p.planName, locale)} />
                </Td>
                <Td>{money(p.premium)}</Td>
                <Td className={cn("whitespace-nowrap", renewalDue(p) ? "font-medium text-warn" : "text-ink-soft")}>
                  {shortDate(p.endDate)}
                </Td>
                <Td>
                  <Badge status={p.status} />
                </Td>
                <Td>
                  <Badge status={p.paymentStatus} />
                </Td>
                <Td className="text-end">
                  {p.renewedByLeadId ? (
                    <Link
                      href={`/leads/${p.renewedByLeadId}`}
                      className="text-sm whitespace-nowrap text-plum hover:underline"
                    >
                      {t("policies.renewal")}
                    </Link>
                  ) : (
                    renewalDue(p) &&
                    can(user, "policies:renew") && (
                      <form action={startRenewal}>
                        <Hidden name="policyId" value={p.id} />
                        <Button size="sm">{t("policies.renew")}</Button>
                      </form>
                    )
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
