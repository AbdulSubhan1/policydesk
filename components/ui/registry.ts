// Machine-readable catalogue of the UI library. The /design-system page renders it, and AI agents
// should read it before building UI. Add an entry here whenever a component is added to components/ui.

export type RegistryEntry = {
  name: string;
  file: string;
  group: "Actions" | "Forms" | "Layout" | "Data" | "Navigation" | "Feedback";
  description: string;
  props: string;
  example: string;
};

export const UI_REGISTRY: RegistryEntry[] = [
  // Actions
  {
    name: "Button",
    file: "button.tsx",
    group: "Actions",
    description: "Every clickable action. Pick a variant; never restyle with className.",
    props:
      'variant?: "primary" | "secondary" | "danger" | "ghost" | "inverse" | "option"; size?: "sm" | "md"; form?: string',
    example: '<Button variant="primary">Book policy</Button>',
  },
  {
    name: "ButtonLink",
    file: "button-link.tsx",
    group: "Actions",
    description: "A link that looks like a Button, for navigation.",
    props: "href; variant?; size?",
    example: '<ButtonLink href="/opportunities/new" variant="primary">New opportunity</ButtonLink>',
  },

  // Forms
  {
    name: "Field",
    file: "field.tsx",
    group: "Forms",
    description: "Label + control + hint or translated error. The demo runs the shared rules from schemas/fields.ts.",
    props: "label; hint?; error?: message key; group?: true for multi-input controls such as PhoneInput",
    example: '<Field label={t("email")} error={errorOf("email")}><Input {...form.register("email")} /></Field>',
  },
  {
    name: "Input",
    file: "input.tsx",
    group: "Forms",
    description: "Text, email, number, date and file inputs. Always give a placeholder.",
    props: "...input attributes",
    example: '<Input type="email" placeholder={t("placeholders.email")} {...form.register("email")} />',
  },
  {
    name: "Autocomplete",
    file: "autocomplete.tsx",
    group: "Forms",
    description:
      "The only dropdown: search, groups, hints, keyboard, placeholder. In React Hook Form use FormAutocomplete.",
    props:
      "options: { value; label; group?; hint? }[]; name?; value?; defaultValue?; onChange?; placeholder?; invalid?; disabled?",
    example:
      '<Autocomplete name="stage" defaultValue={lead.stage} options={keyedOptions(t, "status", EDITABLE_LEAD_STAGES)} />',
  },
  {
    name: "PhoneInput",
    file: "phone-input.tsx",
    group: "Forms",
    description:
      "Country code + number stored as E.164 (+971501234567). Lock the country with lockCountry. Validate with `phone`.",
    props: 'name?; value?; defaultValue?; onChange?; defaultCountry?: "AE"; lockCountry?: boolean; invalid?',
    example: '<PhoneInput name="phone" defaultCountry="AE" lockCountry />',
  },
  {
    name: "Textarea",
    file: "textarea.tsx",
    group: "Forms",
    description: "Multi-line text.",
    props: "...textarea attributes",
    example: '<Textarea rows={3} placeholder={t("placeholders.notes")} {...form.register("notes")} />',
  },
  {
    name: "Checkbox",
    file: "checkbox.tsx",
    group: "Forms",
    description: "Custom-drawn checkbox with its label; the whole row is clickable. Three sizes.",
    props: 'label; hint?; size?: "sm" | "md" | "lg"; ...input attributes',
    example: '<Checkbox name="permissions" value="leads:edit" label="Change lead stage" />',
  },
  {
    name: "Radio",
    file: "radio.tsx",
    group: "Forms",
    description: "Custom-drawn radio. Label with aria-label inside tables. Three sizes.",
    props: 'size?: "sm" | "md" | "lg"; ...input attributes',
    example: '<Radio name="doc-3" value="required" aria-label="Required" />',
  },
  {
    name: "InlineForm",
    file: "inline-form.tsx",
    group: "Forms",
    description: "A choice and a button on one line for one-click server actions.",
    props: "action: server action; ...form attributes",
    example: "<InlineForm action={updateLeadStage}>…</InlineForm>",
  },
  {
    name: "FormError",
    file: "form-error.tsx",
    group: "Forms",
    description: "Form-level error from a server action, translated from its key.",
    props: "message?: message key",
    example: "<FormError message={rootError} />",
  },
  {
    name: "Hidden",
    file: "hidden.tsx",
    group: "Forms",
    description: "Carries an id into a one-click server action form. Renders nothing visible.",
    props: "name: string; value: string | number",
    example: '<Hidden name="leadId" value={lead.id} />',
  },

  // Layout
  {
    name: "PageHeader",
    file: "page-header.tsx",
    group: "Layout",
    description: "The top of every page: title, one-line description, optional back link and main action.",
    props: "title; description?; action?; back?: { href; label }",
    example: '<PageHeader title="Leads" description="…" action={<ButtonLink …/>} />',
  },
  {
    name: "Panel",
    file: "panel.tsx",
    group: "Layout",
    description: "A titled section of a page. Use flush for tables, lists and tabs; footer for an add form.",
    props: "title?; description?; actions?; footer?; flush?; children",
    example: '<Panel title="Customer" actions={<Button>Save</Button>}>…</Panel>',
  },
  {
    name: "PanelSection",
    file: "panel-section.tsx",
    group: "Layout",
    description: "A padded block inside a flush Panel, e.g. a tab's content. muted marks a form area.",
    props: "muted?; children",
    example: "<PanelSection muted><QuoteForm … /></PanelSection>",
  },
  {
    name: "DetailList",
    file: "detail-list.tsx",
    group: "Layout",
    description: "A record's details as label and value pairs in 1–3 columns. Empty values show a dash.",
    props: "items: { label; value }[]; columns?: 1 | 2 | 3",
    example: '<DetailList columns={3} items={[{ label: "ID number", value: kyc.idNumber }]} />',
  },

  // Data
  {
    name: "DataTable",
    file: "data-table.tsx",
    group: "Data",
    description:
      "Every list: columns, search (?q=), pill filters (?filter=), pagination (?page=) and an empty state, all server-side.",
    props:
      "rows; columns: Column[]; rowKey; path; params?; search?; filters?; pagination?; empty; minWidth?; embedded?",
    example:
      '<DataTable path="/leads" params={params} rows={rows} columns={[…]} pagination={{ page, pageSize, total }} />',
  },
  {
    name: "CellText",
    file: "cell-text.tsx",
    group: "Data",
    description: "Two-line text for a table cell or list row that truncates instead of overflowing; optional link.",
    props: "primary; secondary?; href?",
    example: "<CellText href={`/leads/${id}`} primary={name} secondary={email} />",
  },
  {
    name: "ListRow",
    file: "list-row.tsx",
    group: "Data",
    description: "One row of a simple list inside a flush Panel, with an action at the end.",
    props: "children; action?; muted?",
    example: '<ListRow action={<Button size="sm">Disable</Button>}>…</ListRow>',
  },
  {
    name: "Badge",
    file: "badge.tsx",
    group: "Data",
    description: "Status pill. Colour and translated label come from the status value.",
    props: "status?: string; tone?: BadgeTone; children?",
    example: '<Badge status="approved" />',
  },
  {
    name: "Stat",
    file: "stat.tsx",
    group: "Data",
    description: "A headline number with its label, optionally a link.",
    props: "label; value; href?",
    example: '<Stat label="Open leads" value="12" href="/leads" />',
  },
  {
    name: "ProgressBar",
    file: "progress-bar.tsx",
    group: "Data",
    description: "Share of a total in 10% steps, with classes only.",
    props: "value: number; total: number",
    example: "<ProgressBar value={3} total={10} />",
  },
  {
    name: "Icon",
    file: "icon.tsx",
    group: "Data",
    description: "Our own icon set. Add icons in icon.tsx, never from a package.",
    props: "name: IconName; size?; className?",
    example: '<Icon name="shield" />',
  },

  // Navigation
  {
    name: "PillNav",
    file: "pill-nav.tsx",
    group: "Navigation",
    description: "Pick one of a few views, e.g. a product. DataTable uses it for its filters.",
    props: "items: { href; label; active }[]; label",
    example: '<PillNav label="Product" items={PRODUCTS.map(…)} />',
  },
  {
    name: "Tabs",
    file: "tabs.tsx",
    group: "Navigation",
    description: "Underlined tabs for sections of one record, driven by the URL.",
    props: "tabs: { id; label; href; count? }[]; current; label",
    example: '<Tabs current={tab} label="Sections" tabs={…} />',
  },

  // Feedback
  {
    name: "EmptyState",
    file: "empty-state.tsx",
    group: "Feedback",
    description: "Nothing to show: an icon, what is missing, why, and the next step.",
    props: "title; description?; icon?: IconName; action?",
    example: '<EmptyState icon="shield" title="Nothing to renew" action={<ButtonLink …/>} />',
  },
  {
    name: "Forbidden",
    file: "forbidden.tsx",
    group: "Feedback",
    description: "Replaces a page when the role lacks the permission.",
    props: "permission: Permission",
    example: '<Forbidden permission="kyc:review" />',
  },
];
