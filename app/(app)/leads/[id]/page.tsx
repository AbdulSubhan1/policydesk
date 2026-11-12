import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ActivityFeed } from "@/components/leads/activity-feed";
import { DocumentsTab } from "@/components/leads/documents-tab";
import { KycTab } from "@/components/leads/kyc-tab";
import { PolicyTab } from "@/components/leads/policy-tab";
import { ProgressRail } from "@/components/leads/progress-rail";
import { QuotesTab } from "@/components/leads/quotes-tab";
import {
  Autocomplete,
  Badge,
  Button,
  DetailList,
  Forbidden,
  Hidden,
  InlineForm,
  PageHeader,
  Panel,
  Tabs,
} from "@/components/ui";
import { EDITABLE_LEAD_STAGES } from "@/constants/statuses";
import { money, shortDate } from "@/lib/format";
import { keyedOptions } from "@/lib/options";
import { can, scopeOf } from "@/lib/rbac";
import { reassignAdvisor, updateLeadStage } from "@/server/actions/leads";
import { requireUser } from "@/server/auth";
import {
  getDocuments,
  getKyc,
  getLeadContext,
  getOrder,
  getPolicy,
  getPolicyById,
  getQuotes,
} from "@/server/queries/lead-details";
import { usersWithPermission } from "@/server/queries/users";

const TABS = { quotes: QuotesTab, kyc: KycTab, documents: DocumentsTab, policy: PolicyTab };
type TabId = keyof typeof TABS;

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  if (scopeOf(user, "leads") === "none") return <Forbidden permission="leads:view_own" />;

  const { lead, opportunity, departmentKey, advisorName, closed } = await getLeadContext((await params).id);
  const leadId = lead.id;
  const [quotes, kyc, docs, policy, order, previous, t] = await Promise.all([
    getQuotes(leadId),
    getKyc(leadId),
    getDocuments(leadId),
    getPolicy(leadId),
    getOrder(leadId),
    lead.previousPolicyId ? getPolicyById(lead.previousPolicyId) : undefined,
    getTranslations(),
  ]);

  const accepted = quotes.find((q) => q.status === "accepted");
  const kycStatus = kyc?.record.status ?? "pending";
  // Paid on the website but not booked yet: the money is in, so the step says so instead of "Not yet"
  const paidOnline = !policy && order?.status === "paid";
  const steps = [
    {
      tab: "quotes",
      label: t("lead.steps.quote"),
      detail: accepted?.insurer ?? t("lead.steps.quotesSent", { count: quotes.length }),
      done: !!accepted,
    },
    { tab: "kyc", label: t("lead.steps.kyc"), detail: t(`status.${kycStatus}`), done: kycStatus === "approved" },
    {
      tab: "documents",
      label: t("lead.steps.documents"),
      detail: t("lead.steps.documentsCount", {
        done: docs.required.length - docs.missing.length,
        total: docs.required.length,
      }),
      done: docs.missing.length === 0,
    },
    {
      tab: "policy",
      label: t("lead.steps.booked"),
      detail: policy?.policyNumber ?? t("lead.steps.notYet"),
      done: !!policy,
    },
    {
      tab: "policy",
      label: t("lead.steps.paid"),
      detail: policy
        ? t(`status.${policy.paymentStatus}`)
        : paidOnline
          ? t("lead.steps.paidOnline", { amount: money(order.amount) })
          : t("lead.steps.notYet"),
      done: policy ? policy.paymentStatus === "paid" : paidOnline,
    },
  ];

  // Open the first unfinished step unless a tab was picked
  const requested = (await searchParams).tab;
  const tab = (requested && requested in TABS ? requested : (steps.find((s) => !s.done)?.tab ?? "policy")) as TabId;
  const Section = TABS[tab];
  const advisors =
    can(user, "leads:assign") && !closed ? await usersWithPermission(lead.departmentId, "quotes:create") : [];

  return (
    <>
      <PageHeader
        back={{ href: "/leads", label: t("nav.leads") }}
        title={opportunity.customerName}
        description={t("lead.summary", {
          product: t(`products.${opportunity.product}`),
          department: t(`departments.${departmentKey}`),
          advisor: advisorName ?? t("lead.nobody"),
        })}
        action={
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="grey">{lead.reference}</Badge>
            <Badge status={lead.type} />
            <Badge status={lead.stage} />
          </div>
        }
      />
      {previous && (
        <p className="-mt-3 mb-5 text-sm text-plum">
          {t("lead.renews", { policy: previous.policyNumber, date: shortDate(previous.endDate) })}
        </p>
      )}

      <ProgressRail steps={steps} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="self-start" flush>
          <Tabs
            label={t("lead.tabs.quotes")}
            current={tab}
            tabs={[
              { id: "quotes", label: t("lead.tabs.quotes"), href: "?tab=quotes", count: quotes.length },
              { id: "kyc", label: t("lead.tabs.kyc"), href: "?tab=kyc" },
              { id: "documents", label: t("lead.tabs.documents"), href: "?tab=documents", count: docs.files.length },
              { id: "policy", label: t("lead.tabs.policy"), href: "?tab=policy" },
            ]}
          />
          <Section leadId={leadId} />
        </Panel>

        <div className="grid content-start gap-6">
          <Panel title={t("lead.customerCard")}>
            <div className="grid gap-4">
              <DetailList
                items={[
                  { label: t("opportunities.email"), value: opportunity.email },
                  { label: t("opportunities.phone"), value: opportunity.phone },
                  {
                    label: t("lead.cameFrom"),
                    value:
                      scopeOf(user, "opportunities") === "none" ? (
                        t("lead.opportunityNumber", { id: opportunity.id })
                      ) : (
                        <Link href={`/opportunities/${opportunity.id}`} className="text-brand hover:underline">
                          {t("lead.opportunityNumber", { id: opportunity.id })}
                        </Link>
                      ),
                  },
                ]}
              />
              {can(user, "leads:edit") && !closed && (
                <InlineForm key={lead.stage} action={updateLeadStage}>
                  <Hidden name="leadId" value={lead.id} />
                  <Autocomplete
                    name="stage"
                    defaultValue={lead.stage}
                    aria-label={t("leads.stage")}
                    options={keyedOptions(t, "status", EDITABLE_LEAD_STAGES)}
                  />
                  <Button size="sm">{t("lead.setStage")}</Button>
                </InlineForm>
              )}
              {advisors.length > 0 && (
                <InlineForm key={`advisor-${lead.advisorId}`} action={reassignAdvisor}>
                  <Hidden name="leadId" value={lead.id} />
                  <Autocomplete
                    name="advisorId"
                    defaultValue={lead.advisorId ?? ""}
                    aria-label={t("leads.advisor")}
                    options={advisors.map((a) => ({ value: String(a.id), label: a.name }))}
                  />
                  <Button size="sm">{t("lead.reassign")}</Button>
                </InlineForm>
              )}
            </div>
          </Panel>

          <Panel title={t("lead.activity")} flush>
            <ActivityFeed leadId={leadId} />
          </Panel>
        </div>
      </div>
    </>
  );
}
