import { getTranslations } from "next-intl/server";
import { ActivityFeed } from "@/components/leads/activity-feed";
import { ContactCard } from "@/components/leads/contact-card";
import { DealCard } from "@/components/leads/deal-card";
import { DocumentsTab } from "@/components/leads/documents-tab";
import { KycTab } from "@/components/leads/kyc-tab";
import { LeadActions } from "@/components/leads/lead-actions";
import { PolicyTab } from "@/components/leads/policy-tab";
import { ProgressRail, type RailStep } from "@/components/leads/progress-rail";
import { QuotesTab } from "@/components/leads/quotes-tab";
import { Alert, Badge, ButtonLink, Forbidden, PageHeader, Panel, Tabs } from "@/components/ui";
import { money, shortDate } from "@/lib/format";
import { scopeOf } from "@/lib/rbac";
import { requireUser } from "@/server/auth";
import {
  getDocuments,
  getKyc,
  getLeadContext,
  getOrder,
  getPolicy,
  getPolicyById,
  getQuotes,
  getTimeline,
} from "@/server/queries/lead-details";

const TABS = { quotes: QuotesTab, kyc: KycTab, documents: DocumentsTab, policy: PolicyTab };
type TabId = keyof typeof TABS;

/** Events shown in the side column until "All N events" is opened. */
const LATEST_EVENTS = 3;

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; activity?: string }>;
}) {
  const user = await requireUser();
  if (scopeOf(user, "leads") === "none") return <Forbidden permission="leads:view_own" />;

  const { lead, opportunity, departmentKey, advisorName } = await getLeadContext((await params).id);
  const leadId = lead.id;
  const [quotes, kyc, docs, policy, order, timeline, previous, query, t] = await Promise.all([
    getQuotes(leadId),
    getKyc(leadId),
    getDocuments(leadId),
    getPolicy(leadId),
    getOrder(leadId),
    getTimeline(leadId),
    lead.previousPolicyId ? getPolicyById(lead.previousPolicyId) : undefined,
    searchParams,
    getTranslations(),
  ]);

  const accepted = quotes.find((q) => q.status === "accepted");
  const paidOnline = order?.status === "paid" ? order : undefined;
  const kycStatus = kyc?.record.status ?? "pending";
  const documentsDone = docs.required.length - docs.missing.length;
  const steps: (RailStep & { tab: TabId })[] = [
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
      detail: t("lead.steps.documentsCount", { done: documentsDone, total: docs.required.length }),
      done: docs.missing.length === 0,
    },
    {
      tab: "policy",
      label: t("lead.steps.booked"),
      detail: policy?.policyNumber ?? t("lead.steps.notYet"),
      done: !!policy,
    },
    // Before booking, a paid website order is the payment; booking then marks the policy paid from it
    {
      tab: "policy",
      label: t("lead.steps.paid"),
      detail: policy
        ? t(`status.${policy.paymentStatus}`)
        : paidOnline
          ? t("lead.steps.paidOnline", { amount: money(paidOnline.amount) })
          : t("lead.steps.notYet"),
      done: policy ? policy.paymentStatus === "paid" : !!paidOnline,
    },
  ];
  const next = steps.find((s) => !s.done);

  // Open the first unfinished step unless a tab was picked
  const tab = (query.tab && query.tab in TABS ? query.tab : (next?.tab ?? "policy")) as TabId;
  const Section = TABS[tab];
  const allActivity = query.activity === "all";
  const nextAction =
    next?.tab === "kyc" ? (kycStatus === "pending" || kycStatus === "rejected" ? "kycStart" : "kycOpen") : next?.tab;

  return (
    <>
      <PageHeader
        back={{ href: "/leads", label: t("nav.leads") }}
        title={opportunity.customerName}
        badges={
          <span className="flex flex-wrap gap-1.5">
            <Badge status={lead.stage} />
            {lead.type === "renewal" && <Badge status="renewal" />}
            {paidOnline && <Badge tone="green">{t("leads.paidOnline")}</Badge>}
          </span>
        }
        description={
          <>
            {t("lead.headline", {
              product: t(`products.${opportunity.product}`),
              department: t(`departments.${departmentKey}`),
              type: t(`status.${lead.type}`),
              advisor: advisorName ?? t("lead.nobody"),
            })}{" "}
            · <span className="font-mono">{lead.reference}</span>
          </>
        }
        action={<LeadActions leadId={leadId} tab={tab} />}
      />
      {previous && (
        <p className="-mt-3 mb-5 text-sm text-plum">
          {t("lead.renews", { policy: previous.policyNumber, date: shortDate(previous.endDate) })}
        </p>
      )}

      {paidOnline?.paidAt && !policy && next && (
        <Alert
          tone="success"
          className="mb-4"
          title={t("lead.paidOnline.title", { amount: money(paidOnline.amount), date: shortDate(paidOnline.paidAt) })}
          action={
            <ButtonLink href={`?tab=${next.tab}`} variant="primary" size="sm" scroll={false}>
              {t(`lead.nextAction.${nextAction}`)}
            </ButtonLink>
          }
        >
          {t(`lead.paidOnline.next.${nextAction === "kycStart" ? "kycStart" : next.tab}`)}
        </Alert>
      )}

      <ProgressRail steps={steps.map((s) => ({ ...s, href: `?tab=${s.tab}` }))} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_auto_1fr]">
        <ContactCard leadId={leadId} className="lg:col-start-2 lg:row-start-1" />

        <Panel className="self-start lg:col-start-1 lg:row-span-3 lg:row-start-1" flush>
          <Tabs
            label={t("lead.tabs.quotes")}
            current={tab}
            tabs={[
              { id: "quotes", label: t("lead.tabs.quotes"), href: "?tab=quotes", count: quotes.length },
              { id: "kyc", label: t("lead.tabs.kyc"), href: "?tab=kyc" },
              docs.required.length > 0
                ? {
                    id: "documents",
                    label: t("lead.tabs.documentsProgress", { done: documentsDone, total: docs.required.length }),
                    href: "?tab=documents",
                  }
                : {
                    id: "documents",
                    label: t("lead.tabs.documents"),
                    href: "?tab=documents",
                    count: docs.files.length,
                  },
              { id: "policy", label: t("lead.tabs.policy"), href: "?tab=policy" },
            ]}
          />
          <Section leadId={leadId} />
        </Panel>

        <DealCard leadId={leadId} className="self-start lg:col-start-2" />

        <Panel
          id="activity"
          title={t("lead.activity")}
          summary={`· ${t("lead.activityCount", { count: timeline.length })}`}
          collapsible
          flush
          className="self-start lg:col-start-2"
        >
          <ActivityFeed leadId={leadId} limit={allActivity ? undefined : LATEST_EVENTS} />
          {timeline.length > LATEST_EVENTS && (
            <div className="border-t border-line px-5 py-3">
              <ButtonLink
                href={allActivity ? `?tab=${tab}#activity` : `?tab=${tab}&activity=all#activity`}
                variant="ghost"
                size="sm"
                scroll={false}
              >
                {allActivity ? t("lead.activityLatest") : t("lead.activityAll", { count: timeline.length })}
              </ButtonLink>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
