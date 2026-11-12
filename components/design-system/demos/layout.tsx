import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  CellText,
  DetailList,
  ListRow,
  PageHeader,
  Panel,
  PanelSection,
  PillNav,
  Tabs,
} from "@/components/ui";
import { withParams } from "@/lib/url";
import { Demo, type DemoProps } from "../demo";

/** Page structure and navigation between views. */
export function LayoutDemos({ name, path, params }: DemoProps) {
  const t = useTranslations();

  switch (name) {
    case "Tabs": {
      const tab = params.tab === "kyc" || params.tab === "policy" ? params.tab : "quotes";
      return (
        <Demo title="Driven by the URL" description="Each tab is a link, so the back button and shared links work.">
          <Panel flush>
            <Tabs
              label={t("lead.tabs.quotes")}
              current={tab}
              tabs={[
                {
                  id: "quotes",
                  label: t("lead.tabs.quotes"),
                  href: withParams(path, params, { tab: "quotes" }),
                  count: 2,
                },
                { id: "kyc", label: t("lead.tabs.kyc"), href: withParams(path, params, { tab: "kyc" }) },
                { id: "policy", label: t("lead.tabs.policy"), href: withParams(path, params, { tab: "policy" }) },
              ]}
            />
            <PanelSection>{t(`lead.tabs.${tab}`)}</PanelSection>
          </Panel>
        </Demo>
      );
    }
    case "PillNav":
      return (
        <Demo title="Motion highlight" description="Hover the pills: one background glides between them.">
          <PillNav
            label={t("plans.product")}
            items={(["car", "health", "travel", "home", "life"] as const).map((p) => ({
              href: withParams(path, params, { product: p }),
              label: t(`products.${p}`),
              active: (params.product ?? "car") === p,
            }))}
          />
        </Demo>
      );
    case "PageHeader":
      return (
        <Demo title="Back link and action">
          <PageHeader
            back={{ href: path, label: t("nav.leads") }}
            title="Ahmed Rahman"
            description={t("lead.summary", {
              product: t("products.car"),
              department: t("departments.motor_marine"),
              advisor: "Aisha Khan",
            })}
            action={<Badge status="quoted" />}
          />
        </Demo>
      );
    case "Panel":
      return (
        <>
          <Demo title="With actions">
            <Panel title={t("lead.customerCard")} actions={<Button size="sm">{t("common.save")}</Button>}>
              <DetailList
                columns={2}
                items={[
                  { label: t("opportunities.email"), value: "ahmed@example.com" },
                  { label: t("opportunities.phone"), value: "+971501234567" },
                ]}
              />
            </Panel>
          </Demo>
          <Demo title="Flush with a footer" description="For lists and tables that run edge to edge.">
            <Panel
              title={t("plans.insurers")}
              flush
              footer={<span className="text-sm text-muted">{t("common.add")}</span>}
            >
              <ul>
                <ListRow action={<Badge status="active" />}>
                  <CellText primary="Northwind Assurance" secondary={t("plans.planCount", { count: 12 })} />
                </ListRow>
              </ul>
            </Panel>
          </Demo>
          <Demo
            title="Folds on a phone"
            description="collapsible: tap the title to open it below lg; always open above."
          >
            <Panel title={t("lead.deal.title")} summary={`· ${t("common.perYear", { amount: "$1,140" })}`} collapsible>
              <DetailList items={[{ label: t("lead.deal.plan"), value: "Northwind Plus" }]} />
            </Panel>
          </Demo>
        </>
      );
    case "PanelSection":
      return (
        <Demo title="Plain and muted">
          <Panel title={t("lead.tabs.quotes")} flush>
            <PanelSection>{t("lead.quotes.empty")}</PanelSection>
            <PanelSection muted>{t("lead.quotes.noPlans")}</PanelSection>
          </Panel>
        </Demo>
      );
    case "DetailList":
      return (
        <Demo title="Three columns" description="Empty values show a dash.">
          <DetailList
            columns={3}
            items={[
              { label: t("lead.kyc.idNumber"), value: "784-1990-1234567-1" },
              { label: t("lead.kyc.nationality"), value: "Pakistan" },
              { label: t("lead.policy.reference"), value: "" },
            ]}
          />
        </Demo>
      );
    default:
      return null;
  }
}
