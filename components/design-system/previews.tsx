import { useTranslations } from "next-intl";
import {
  Autocomplete,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CellText,
  Checkbox,
  DetailList,
  EmptyRow,
  EmptyState,
  Field,
  FilterTabs,
  FormError,
  Icon,
  ICON_NAMES,
  InlineForm,
  Input,
  ListRow,
  PageHeader,
  PillNav,
  ProgressBar,
  Radio,
  Stat,
  Table,
  Tabs,
  Td,
  Textarea,
  Th,
  Tr,
} from "@/components/ui";
import { LEAD_STAGES } from "@/constants/statuses";

/** A live example of each library component, keyed by its registry name. */
export function Preview({ name }: { name: string }) {
  const t = useTranslations("designSystem");
  const table = (
    <Table size="sm">
      <thead>
        <tr>
          <Th>Customer</Th>
          <Th>Stage</Th>
        </tr>
      </thead>
      <tbody>
        <Tr>
          <Td>
            <CellText primary="Ahmed Rahman" secondary="Lead #2" />
          </Td>
          <Td>
            <Badge status="won" />
          </Td>
        </Tr>
        <EmptyRow colSpan={2}>No more leads.</EmptyRow>
      </tbody>
    </Table>
  );

  const previews: Record<string, React.ReactNode> = {
    Button: (
      <div className="flex flex-wrap gap-2">
        <Button variant="primary">Primary</Button>
        <Button>Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="ghost">Ghost</Button>
        <Button size="sm">Small</Button>
        <Button disabled>Disabled</Button>
      </div>
    ),
    ButtonLink: <ButtonLink href="/design-system">Link styled as a button</ButtonLink>,
    Input: (
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="name@example.com" />
        <Input type="file" />
      </div>
    ),
    Autocomplete: (
      <div className="grid gap-3 sm:grid-cols-2">
        <Autocomplete
          aria-label="Product"
          placeholder="Search products…"
          options={[
            { value: "car", label: "Car", group: "Motor & Marine" },
            { value: "bike", label: "Bike", group: "Motor & Marine" },
            { value: "yacht", label: "Yacht", group: "Motor & Marine" },
            { value: "health", label: "Health", group: "Health" },
            { value: "travel", label: "Travel", group: "Home & Travel", hint: "Single trip or annual" },
          ]}
        />
        <Autocomplete
          aria-label="Stage"
          defaultValue="quoted"
          options={LEAD_STAGES.map((s) => ({ value: s, label: s }))}
        />
      </div>
    ),
    Textarea: <Textarea rows={2} placeholder="Notes" />,
    Checkbox: (
      <div className="grid gap-3">
        <Checkbox label="Change lead stage" hint="leads:edit" defaultChecked />
        <Checkbox label="Cancel policies" />
        <Checkbox label="Locked permission" disabled defaultChecked />
      </div>
    ),
    Radio: (
      <span className="flex gap-3">
        <Radio name="demo-radio" aria-label="Optional" defaultChecked />
        <Radio name="demo-radio" aria-label="Required" />
      </span>
    ),
    Hidden: <p className="text-sm text-muted">Renders nothing visible.</p>,
    Field: (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Email" hint="We never share it">
          <Input />
        </Field>
        <Field label="Phone" error="validation.phone">
          <Input defaultValue="12" />
        </Field>
      </div>
    ),
    FormError: <FormError message="errors.invalidLogin" />,
    InlineForm: (
      <InlineForm>
        <Autocomplete
          aria-label="Stage"
          defaultValue="quoted"
          options={LEAD_STAGES.map((s) => ({ value: s, label: s }))}
        />
        <Button size="sm" type="button">
          Set stage
        </Button>
      </InlineForm>
    ),
    Card: (
      <Card>
        <CardBody>{t("sampleBody")}</CardBody>
      </Card>
    ),
    CardHeader: (
      <Card>
        <CardHeader title={t("sampleHeading")} description={t("sampleBody")} action={<Badge status="active" />} />
      </Card>
    ),
    CardBody: (
      <Card>
        <CardBody>{t("sampleBody")}</CardBody>
      </Card>
    ),
    PageHeader: (
      <PageHeader
        back={{ href: "/design-system", label: "Back" }}
        title={t("sampleHeading")}
        description={t("sampleBody")}
      />
    ),
    DetailList: (
      <DetailList
        columns={3}
        items={[
          { label: "Policy", value: "PD-2026-00034" },
          { label: "Premium", value: "$1,110" },
          { label: "Reference", value: "" },
        ]}
      />
    ),
    Badge: (
      <div className="flex flex-wrap gap-1.5">
        {["new", "qualified", "kyc", "approved", "rejected", "lost", "renewal"].map((s) => (
          <Badge key={s} status={s} />
        ))}
      </div>
    ),
    Stat: (
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Open leads" value="12" href="/leads" />
        <Stat label="Win rate" value="67%" />
      </div>
    ),
    ProgressBar: (
      <div className="grid gap-2">
        <ProgressBar value={2} total={10} />
        <ProgressBar value={7} total={10} />
      </div>
    ),
    Icon: (
      <div className="flex flex-wrap gap-3 text-ink-soft">
        {ICON_NAMES.map((n) => (
          <span key={n} className="grid justify-items-center gap-1 text-xs text-muted">
            <Icon name={n} size={22} />
            {n}
          </span>
        ))}
      </div>
    ),
    Table: table,
    Th: table,
    Tr: table,
    Td: table,
    CellText: (
      <CellText href="/design-system" primary="A very long customer name that will truncate" secondary="Second line" />
    ),
    EmptyRow: table,
    EmptyState: (
      <EmptyState title="Nothing to renew right now">Come back when a policy is close to its end date.</EmptyState>
    ),
    Forbidden: <p className="text-sm text-muted">Full-page message; see any page your role cannot open.</p>,
    ListRow: (
      <Card>
        <ul>
          <ListRow action={<Button size="sm">Disable</Button>}>
            <CellText primary="Northwind Assurance" secondary="12 plans" />
          </ListRow>
          <ListRow muted action={<Button size="sm">Enable</Button>}>
            <CellText primary="Crescent Cover" secondary="Inactive" />
          </ListRow>
        </ul>
      </Card>
    ),
    PillNav: (
      <PillNav
        label="Products"
        items={[
          { href: "/design-system", label: "Car", active: true },
          { href: "/design-system?x=1", label: "Health", active: false },
        ]}
      />
    ),
    FilterTabs: <FilterTabs base="/design-system" values={["new", "contacted", "qualified"]} />,
    Tabs: (
      <Card>
        <Tabs
          label="Sections"
          current="quotes"
          tabs={[
            { id: "quotes", label: "Quotes", href: "/design-system", count: 2 },
            { id: "kyc", label: "KYC", href: "/design-system?tab=kyc" },
          ]}
        />
      </Card>
    ),
  };

  return previews[name] ?? null;
}
