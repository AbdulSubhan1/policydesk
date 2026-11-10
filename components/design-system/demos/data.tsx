import { useTranslations } from "next-intl";
import {
  ActionBar,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  ButtonLink,
  CellText,
  DataTable,
  Icon,
  ICON_NAMES,
  ListRow,
  Panel,
  Stat,
  Timeline,
} from "@/components/ui";
import { LEAD_STAGES } from "@/constants/statuses";
import { money } from "@/lib/format";
import { keyedOptions } from "@/lib/options";
import { leadReference } from "@/lib/reference";
import { Demo, type DemoProps } from "../demo";

// Sample rows for the live DataTable example. Search, filter and pages work on them through the URL.
const SAMPLE = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  customer: `${["Ahmed Rahman", "Layla Haddad", "John Smith", "Priya Patel", "Yusuf Khan"][i % 5]} ${i + 1}`,
  product: (["car", "health", "travel", "home", "life"] as const)[i % 5],
  stage: LEAD_STAGES[i % 3],
  reference: leadReference((["car", "health", "travel", "home", "life"] as const)[i % 5]),
  premium: 400 + i * 85,
}));
const PAGE = 5;
const TEAM = ["Aisha Khan", "Omar Farouk", "Sara Ali", "David Chen", "Fatima Noor", "Ravi Menon"];

/** Tables, rows, statuses, numbers, people and icons. */
export function DataDemos({ name, path, params }: DemoProps) {
  const t = useTranslations();

  switch (name) {
    case "DataTable": {
      const q = params.q?.toLowerCase();
      const rows = SAMPLE.filter(
        (r) => (!params.filter || r.stage === params.filter) && (!q || r.customer.toLowerCase().includes(q)),
      );
      const page = Math.max(1, Number(params.page) || 1);
      return (
        <Demo
          title="Search, filters, pages and selection"
          description="All state lives in the URL. Tick rows to see the ActionBar."
        >
          <form id="demo-table" action={path}>
            <ActionBar form="demo-table" name="ids">
              <Button type="button" size="sm" variant="ghost">
                <Icon name="send" size={15} />
                {t("leads.bulk.setStage")}
              </Button>
            </ActionBar>
          </form>
          <DataTable
            path={path}
            params={params}
            rows={rows.slice((page - 1) * PAGE, page * PAGE)}
            rowKey={(r) => r.id}
            minWidth="sm"
            select={{ form: "demo-table", name: "ids", label: (r) => r.customer }}
            search={{ placeholder: t("leads.search") }}
            filters={{ label: t("leads.stage"), options: keyedOptions(t, "status", LEAD_STAGES.slice(0, 3)) }}
            pagination={{ page, pageSize: PAGE, total: rows.length }}
            empty={{
              title: t("leads.empty"),
              icon: "search",
              action: <ButtonLink href={path}>{t("common.all")}</ButtonLink>,
            }}
            columns={[
              {
                key: "customer",
                header: t("leads.customer"),
                cell: (r) => <CellText primary={r.customer} secondary={r.reference} />,
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
        </Demo>
      );
    }
    case "CellText":
      return (
        <Demo title="Truncates long text" description="Two lines that never overflow their cell.">
          <div className="max-w-xs">
            <CellText
              href={path}
              primary="Muhammad Abdullah Al-Rashidi Insurance Brokers LLC"
              secondary="ahmed.rahman.longemail@example.com"
            />
          </div>
        </Demo>
      );
    case "ListRow":
      return (
        <Demo title="With actions">
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
        </Demo>
      );
    case "Badge":
      return (
        <>
          <Demo title="From a status" description="Colour and translated label come from the value.">
            <div className="flex flex-wrap gap-1.5">
              {["new", "qualified", "kyc", "approved", "rejected", "lost", "renewal", "high"].map((s) => (
                <Badge key={s} status={s} />
              ))}
            </div>
          </Demo>
          <Demo title="Custom tone">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="plum">{t("kycReview.title")}</Badge>
              <Badge tone="grey">v2</Badge>
            </div>
          </Demo>
        </>
      );
    case "Stat":
      return (
        <Demo title="Plain and linked">
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("dashboard.openLeads")} value="12" href={path} />
            <Stat label={t("dashboard.winRate")} value="67%" />
          </div>
        </Demo>
      );
    case "Timeline":
      return (
        <Demo title="A lead's history">
          <Timeline
            items={[
              {
                id: 1,
                icon: "badgeCheck",
                tone: "brand",
                title: t("status.active"),
                description: "PD-2026-00034",
                time: "24 Nov",
              },
              {
                id: 2,
                icon: "shield",
                tone: "info",
                title: t("status.approved"),
                description: t("lead.kyc.compliance"),
                time: "22 Nov",
              },
              {
                id: 3,
                icon: "send",
                tone: "warn",
                title: t("status.quoted"),
                description: "Northwind Gold, $1,200",
                time: "20 Nov",
              },
              { id: 4, icon: "inbox", title: t("status.new"), time: "18 Nov" },
            ]}
          />
        </Demo>
      );
    case "Avatar":
      return (
        <>
          <Demo title="Sizes" description="The colour comes from the name, so a person looks the same everywhere.">
            <div className="flex items-center gap-3">
              <Avatar name="Aisha Khan" size="sm" />
              <Avatar name="Omar Farouk" />
              <Avatar name="Sara Ali" size="lg" />
            </div>
          </Demo>
          <Demo title="Status">
            <div className="flex items-center gap-3">
              <Avatar name="Aisha Khan" status="online" />
              <Avatar name="David Chen" status="away" />
              <Avatar name="Ravi Menon" status="offline" />
            </div>
          </Demo>
        </>
      );
    case "AvatarGroup":
      return (
        <Demo title="With a count" description="Hover a face for the name, or +N for the rest.">
          <div className="grid gap-3">
            <AvatarGroup names={TEAM} />
            <AvatarGroup names={TEAM.slice(0, 3)} size="sm" />
          </div>
        </Demo>
      );
    case "Icon":
      return (
        <Demo title="The whole set" description="Add icons in icon.tsx; never import an icon package.">
          <div className="grid grid-cols-3 gap-4 text-ink-soft sm:grid-cols-6">
            {ICON_NAMES.map((n) => (
              <span key={n} className="grid min-w-0 justify-items-center gap-1 text-xs text-muted">
                <Icon name={n} size={22} />
                <span className="max-w-full truncate">{n}</span>
              </span>
            ))}
          </div>
        </Demo>
      );
    default:
      return null;
  }
}
