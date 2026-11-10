import { useTranslations } from "next-intl";
import {
  Autocomplete,
  Badge,
  Button,
  ButtonLink,
  CellText,
  Checkbox,
  DataTable,
  DetailList,
  EmptyState,
  Field,
  FormError,
  Icon,
  ICON_NAMES,
  InlineForm,
  Input,
  ListRow,
  PageHeader,
  Panel,
  PanelSection,
  PhoneInput,
  PillNav,
  ProgressBar,
  Radio,
  Stat,
  Tabs,
  Textarea,
} from "@/components/ui";
import { LEAD_STAGES } from "@/constants/statuses";
import { money } from "@/lib/format";
import { keyedOptions, productOptions } from "@/lib/options";
import { withParams, type SearchParams } from "@/lib/url";
import { ValidationDemo } from "./validation-demo";

// Sample rows for the live DataTable example. Search, filter and pages work on them through the URL.
const SAMPLE = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  customer: `${["Ahmed Rahman", "Layla Haddad", "John Smith", "Priya Patel", "Yusuf Khan"][i % 5]} ${i + 1}`,
  product: (["car", "health", "travel", "home", "life"] as const)[i % 5],
  stage: LEAD_STAGES[i % 3],
  premium: 400 + i * 85,
}));
const PAGE = 5;
const PATH = "/design-system";

/** A live example of each library component, keyed by its registry name. */
export function Preview({ name, params }: { name: string; params: SearchParams }) {
  const t = useTranslations();

  switch (name) {
    case "Button":
      return (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">{t("lead.policy.book")}</Button>
          <Button>{t("common.save")}</Button>
          <Button variant="danger">{t("lead.policy.cancelPolicy")}</Button>
          <Button variant="ghost">{t("common.disable")}</Button>
          <Button size="sm">{t("lead.setStage")}</Button>
          <Button disabled>{t("common.save")}</Button>
        </div>
      );
    case "ButtonLink":
      return <ButtonLink href={PATH}>{t("opportunities.openLead")}</ButtonLink>;
    case "Input":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("opportunities.email")}>
            <Input type="email" placeholder={t("placeholders.email")} />
          </Field>
          <Field label={t("lead.documents.file")}>
            <Input type="file" />
          </Field>
          <Field label={t("lead.kyc.dateOfBirth")}>
            <Input type="date" />
          </Field>
          <Field label={t("plans.basePremium")}>
            <Input type="number" placeholder={t("placeholders.premium")} disabled />
          </Field>
        </div>
      );
    case "Autocomplete":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("opportunities.product")}>
            <Autocomplete options={productOptions(t)} placeholder={t("placeholders.product")} />
          </Field>
          <Field label={t("leads.stage")}>
            <Autocomplete options={keyedOptions(t, "status", LEAD_STAGES)} defaultValue="quoted" />
          </Field>
        </div>
      );
    case "PhoneInput":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("opportunities.phone")} group>
            <PhoneInput aria-label={t("opportunities.phone")} defaultValue="+971501234567" />
          </Field>
          <Field label={`${t("opportunities.phone")} (PK, lockCountry)`} group>
            <PhoneInput aria-label={t("opportunities.phone")} defaultCountry="PK" lockCountry />
          </Field>
        </div>
      );
    case "Textarea":
      return <Textarea rows={3} placeholder={t("placeholders.notes")} />;
    case "Checkbox":
      return (
        <div className="grid gap-3">
          <Checkbox size="sm" label="size=sm" />
          <Checkbox label={t("permissions.leads:edit")} hint="leads:edit" defaultChecked />
          <Checkbox size="lg" label="size=lg" defaultChecked />
          <Checkbox label={t("roles.locked")} disabled defaultChecked />
        </div>
      );
    case "Radio":
      return (
        <div className="flex items-center gap-4">
          <Radio name="demo-radio" size="sm" aria-label="sm" />
          <Radio name="demo-radio" aria-label="md" defaultChecked />
          <Radio name="demo-radio" size="lg" aria-label="lg" />
        </div>
      );
    case "Field":
      return <ValidationDemo />;
    case "FormError":
      return <FormError message="errors.invalidLogin" />;
    case "Hidden":
      return null;
    case "InlineForm":
      return (
        <InlineForm>
          <Autocomplete
            aria-label={t("leads.stage")}
            defaultValue="quoted"
            options={keyedOptions(t, "status", LEAD_STAGES)}
          />
          <Button size="sm" type="button">
            {t("lead.setStage")}
          </Button>
        </InlineForm>
      );
    case "PageHeader":
      return (
        <PageHeader
          back={{ href: PATH, label: t("nav.leads") }}
          title="Ahmed Rahman"
          description={t("lead.summary", {
            product: t("products.car"),
            department: t("departments.motor_marine"),
            advisor: "Aisha Khan",
          })}
          action={<Badge status="quoted" />}
        />
      );
    case "Panel":
      return (
        <div className="grid gap-4">
          <Panel title={t("lead.customerCard")} actions={<Button size="sm">{t("common.save")}</Button>}>
            <DetailList
              columns={2}
              items={[
                { label: t("opportunities.email"), value: "ahmed@example.com" },
                { label: t("opportunities.phone"), value: "+971501234567" },
              ]}
            />
          </Panel>
          <Panel title={t("plans.insurers")} flush footer={<span className="text-sm text-muted">footer</span>}>
            <ul>
              <ListRow action={<Badge status="active" />}>
                <CellText primary="Northwind Assurance" secondary={t("plans.planCount", { count: 12 })} />
              </ListRow>
            </ul>
          </Panel>
        </div>
      );
    case "PanelSection":
      return (
        <Panel title={t("lead.tabs.quotes")} flush>
          <PanelSection>{t("lead.quotes.empty")}</PanelSection>
          <PanelSection muted>{t("lead.quotes.noPlans")}</PanelSection>
        </Panel>
      );
    case "DetailList":
      return (
        <DetailList
          columns={3}
          items={[
            { label: t("lead.kyc.idNumber"), value: "784-1990-1234567-1" },
            { label: t("lead.kyc.nationality"), value: "Pakistan" },
            { label: t("lead.policy.reference"), value: "" },
          ]}
        />
      );
    case "DataTable": {
      const q = params.q?.toLowerCase();
      const rows = SAMPLE.filter(
        (r) => (!params.filter || r.stage === params.filter) && (!q || r.customer.toLowerCase().includes(q)),
      );
      const page = Math.max(1, Number(params.page) || 1);
      return (
        <DataTable
          path={PATH}
          params={params}
          rows={rows.slice((page - 1) * PAGE, page * PAGE)}
          rowKey={(r) => r.id}
          minWidth="sm"
          search={{ placeholder: t("leads.search") }}
          filters={{ label: t("leads.stage"), options: keyedOptions(t, "status", LEAD_STAGES.slice(0, 3)) }}
          pagination={{ page, pageSize: PAGE, total: rows.length }}
          empty={{
            title: t("leads.empty"),
            icon: "search",
            action: <ButtonLink href={PATH}>{t("common.all")}</ButtonLink>,
          }}
          columns={[
            {
              key: "customer",
              header: t("leads.customer"),
              cell: (r) => <CellText primary={r.customer} secondary={t("leads.leadNumber", { id: r.id })} />,
            },
            { key: "product", header: t("leads.product"), cell: (r) => t(`products.${r.product}`) },
            { key: "stage", header: t("leads.stage"), cell: (r) => <Badge status={r.stage} /> },
            {
              key: "premium",
              header: t("policies.premium"),
              align: "end",
              nowrap: true,
              cell: (r) => money(r.premium),
            },
          ]}
        />
      );
    }
    case "Badge":
      return (
        <div className="flex flex-wrap gap-1.5">
          {["new", "qualified", "kyc", "approved", "rejected", "lost", "renewal", "high"].map((s) => (
            <Badge key={s} status={s} />
          ))}
        </div>
      );
    case "Stat":
      return (
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t("dashboard.openLeads")} value="12" href={PATH} />
          <Stat label={t("dashboard.winRate")} value="67%" />
        </div>
      );
    case "ProgressBar":
      return (
        <div className="grid gap-2">
          <ProgressBar value={2} total={10} />
          <ProgressBar value={7} total={10} />
        </div>
      );
    case "CellText":
      return (
        <CellText
          href={PATH}
          primary="Muhammad Abdullah Al-Rashidi Insurance Brokers LLC"
          secondary="ahmed.rahman.longemail@example.com"
        />
      );
    case "ListRow":
      return (
        <Panel flush>
          <ul>
            <ListRow action={<Button size="sm">{t("common.disable")}</Button>}>
              <CellText primary="Northwind Assurance" secondary={t("plans.planCount", { count: 12 })} />
            </ListRow>
            <ListRow muted action={<Button size="sm">{t("common.enable")}</Button>}>
              <CellText primary="Crescent Cover" secondary={t("common.inactive")} />
            </ListRow>
          </ul>
        </Panel>
      );
    case "Icon":
      return (
        <div className="flex flex-wrap gap-4 text-ink-soft">
          {ICON_NAMES.map((n) => (
            <span key={n} className="grid justify-items-center gap-1 text-xs text-muted">
              <Icon name={n} size={22} />
              {n}
            </span>
          ))}
        </div>
      );
    case "PillNav":
      return (
        <PillNav
          label={t("plans.product")}
          items={(["car", "health", "travel"] as const).map((p) => ({
            href: withParams(PATH, params, { product: p }),
            label: t(`products.${p}`),
            active: (params.product ?? "car") === p,
          }))}
        />
      );
    case "Tabs": {
      const tab = params.tab === "kyc" || params.tab === "policy" ? params.tab : "quotes";
      return (
        <Panel flush>
          <Tabs
            label={t("lead.tabs.quotes")}
            current={tab}
            tabs={[
              {
                id: "quotes",
                label: t("lead.tabs.quotes"),
                href: withParams(PATH, params, { tab: "quotes" }),
                count: 2,
              },
              { id: "kyc", label: t("lead.tabs.kyc"), href: withParams(PATH, params, { tab: "kyc" }) },
              { id: "policy", label: t("lead.tabs.policy"), href: withParams(PATH, params, { tab: "policy" }) },
            ]}
          />
          <PanelSection>{t(`lead.tabs.${tab}`)}</PanelSection>
        </Panel>
      );
    }
    case "EmptyState":
      return (
        <Panel flush>
          <EmptyState
            icon="shield"
            title={t("dashboard.noRenewals")}
            description={t("dashboard.renewalsHint", { days: 45 })}
            action={<ButtonLink href={PATH}>{t("nav.policies")}</ButtonLink>}
          />
        </Panel>
      );
    default:
      return null;
  }
}
