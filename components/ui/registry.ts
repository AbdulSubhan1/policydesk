// Machine-readable catalogue of the UI library. The /design-system pages render it, and AI agents
// should read it before building UI. Add an entry here whenever a component is added to components/ui.

export const UI_GROUPS = [
  "Buttons",
  "Forms",
  "Inputs",
  "Selection",
  "Dates",
  "Overlays",
  "Menus",
  "Navigation",
  "Feedback",
  "Layout",
  "Data",
  "Media",
  "Effects",
] as const;

export type RegistryEntry = {
  name: string;
  file: string;
  group: (typeof UI_GROUPS)[number];
  description: string;
  props: string;
  example: string;
  /** Keyboard support: [keys, what they do]. */
  keyboard?: [string, string][];
};

export const UI_REGISTRY: RegistryEntry[] = [
  // Buttons
  {
    name: "Button",
    file: "button.tsx",
    group: "Buttons",
    description: "Every clickable action. Pick a variant; never restyle with className.",
    props:
      'variant?: "primary" | "secondary" | "danger" | "ghost" | "inverse" | "option"; size?: "sm" | "md"; form?: string',
    example: '<Button variant="primary">Book policy</Button>',
  },
  {
    name: "ButtonLink",
    file: "button-link.tsx",
    group: "Buttons",
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
    props:
      "label; hint?; error?: message key; group?: true for multi-input controls such as PhoneInput; optional?: marks the field (Optional); tag?: a note at the end of the label row",
    example: '<Field label={t("email")} error={errorOf("email")}><Input {...form.register("email")} /></Field>',
  },
  {
    name: "InlineForm",
    file: "inline-form.tsx",
    group: "Forms",
    description: "A choice and a button on one line for one-click server actions.",
    props: "action: server action; ...form attributes",
    example: "<InlineForm action={updateLead}>…</InlineForm>",
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

  // Inputs
  {
    name: "Input",
    file: "input.tsx",
    group: "Inputs",
    description: "Text, email, number, date and file inputs. Always give a placeholder.",
    props: "...input attributes",
    example: '<Input type="email" placeholder={t("placeholders.email")} {...form.register("email")} />',
  },
  {
    name: "PasswordInput",
    file: "password-input.tsx",
    group: "Inputs",
    keyboard: [
      ["Tab", "Moves from the field to the show/hide button"],
      ["Enter / Space", "Shows or hides the password"],
    ],
    description: "A password with a button to show or hide what was typed.",
    props: "...input attributes (no type)",
    example: '<PasswordInput autoComplete="current-password" {...form.register("password")} />',
  },
  {
    name: "NumberInput",
    file: "number-input.tsx",
    group: "Inputs",
    keyboard: [["↑ / ↓", "Adds or subtracts one step"]],
    description: "A number with − and + buttons that respect min, max and step. Use for premiums, sums and counts.",
    props: "step?; min?; max?; ...input attributes",
    example: '<NumberInput min={0} step={50} placeholder={t("placeholders.premium")} {...form.register("premium")} />',
  },
  {
    name: "PhoneInput",
    file: "phone-input.tsx",
    group: "Inputs",
    description:
      "Country code + number stored as E.164 (+971501234567). Lock the country with lockCountry. Validate with `phone`.",
    props: 'name?; value?; defaultValue?; onChange?; defaultCountry?: "AE"; lockCountry?: boolean; invalid?',
    example: '<PhoneInput name="phone" defaultCountry="AE" lockCountry />',
  },
  {
    name: "OtpInput",
    file: "otp-input.tsx",
    group: "Inputs",
    keyboard: [
      ["0–9", "Fills the box and moves on"],
      ["Backspace", "Clears, then moves back"],
      ["Ctrl/⌘ + V", "Pastes the whole code"],
    ],
    description: "A one-time code in separate boxes; pasting a full code fills every box. Submits the joined code.",
    props: "name; length?: 6; label; onComplete?: (code) => void",
    example: '<OtpInput name="code" label="Verification code" />',
  },
  {
    name: "Textarea",
    file: "textarea.tsx",
    group: "Inputs",
    description: "Multi-line text.",
    props: "...textarea attributes",
    example: '<Textarea rows={3} placeholder={t("placeholders.notes")} {...form.register("notes")} />',
  },
  {
    name: "FileUpload",
    file: "file-upload.tsx",
    group: "Inputs",
    keyboard: [
      ["Tab", "Focuses the drop zone"],
      ["Enter / Space", "Opens the file chooser"],
    ],
    description:
      "Drag files onto the zone or click to browse; chosen files are listed with their size and a remove button.",
    props: "hint?; invalid?; accept?; multiple?; ...input attributes",
    example: '<FileUpload accept=".pdf,.jpg,.png" hint="PDF, JPG or PNG up to 2 MB" {...form.register("file")} />',
  },

  // Selection
  {
    name: "Autocomplete",
    file: "autocomplete.tsx",
    group: "Selection",
    description:
      "The only dropdown: search, groups, hints, keyboard, placeholder. In React Hook Form use FormAutocomplete.",
    props:
      "options: { value; label; group?; hint? }[]; name?; value?; defaultValue?; onChange?; placeholder?; invalid?; disabled?",
    example:
      '<Autocomplete name="stage" defaultValue={lead.stage} options={keyedOptions(t, "status", EDITABLE_LEAD_STAGES)} />',
  },
  {
    name: "MultiSelect",
    file: "multi-select.tsx",
    group: "Selection",
    keyboard: [
      ["Type", "Filters the list"],
      ["Enter", "Adds or removes the first match"],
      ["Backspace", "Removes the last tag when the search is empty"],
      ["Esc", "Closes the list"],
    ],
    description:
      "Pick several values from a searchable list; choices show as removable tags. Each value submits as its own input. Inside a Field, pass group.",
    props: "options; name?; defaultValue?: string[]; onChange?; placeholder?; label",
    example: '<MultiSelect name="covers" label="Covers" options={coverOptions(t, product)} />',
  },
  {
    name: "Checkbox",
    file: "checkbox.tsx",
    group: "Selection",
    description: "Custom-drawn checkbox with its label; the whole row is clickable. Three sizes.",
    props: 'label; hint?; size?: "sm" | "md" | "lg"; ...input attributes',
    example: '<Checkbox name="permissions" value="leads:edit" label="Change lead stage" />',
  },
  {
    name: "Radio",
    file: "radio.tsx",
    group: "Selection",
    description: "Custom-drawn radio. Label with aria-label inside tables. Three sizes.",
    props: 'size?: "sm" | "md" | "lg"; ...input attributes',
    example: '<Radio name="doc-3" value="required" aria-label="Required" />',
  },
  {
    name: "RadioGroup",
    file: "radio-group.tsx",
    group: "Selection",
    keyboard: [
      ["↑ ↓ ← →", "Moves the choice"],
      ["Tab", "Leaves the group"],
    ],
    description: "One choice from a short list with a legend: plain rows, or cards with a line of description.",
    props:
      'name; options: { value; label; description? }[]; defaultValue?; label; variant?: "list" | "cards" | "pills"; inputProps? (e.g. register(name)); invalid?; error?',
    example: '<RadioGroup name="method" label="Payment method" variant="cards" options={…} />',
  },
  {
    name: "Switch",
    file: "switch.tsx",
    group: "Selection",
    keyboard: [["Space", "Turns it on or off"]],
    description:
      "On or off that applies straight away, e.g. a setting. For a choice in a form that is saved later, use Checkbox.",
    props: 'label; description?; size?: "sm" | "md"; ...input attributes',
    example: '<Switch name="active" label="Active" defaultChecked />',
  },
  {
    name: "SegmentGroup",
    file: "segment-group.tsx",
    group: "Selection",
    keyboard: [["← →", "Moves the choice"]],
    description: "Two to five options side by side, like a view switch. A real radio group, so it submits with a form.",
    props: "name; options: { value; label }[]; defaultValue?; label",
    example: '<SegmentGroup name="period" label="Period" options={…} defaultValue="month" />',
  },
  {
    name: "Rating",
    file: "rating.tsx",
    group: "Selection",
    keyboard: [["← → ↑ ↓", "Changes the rating"]],
    description: "Stars. With name it is an input (arrow keys change it); without, it only shows value.",
    props: "name?; value?; count?: 5; label",
    example: '<Rating name="satisfaction" label="Service rating" />',
  },

  // Dates
  {
    name: "DatePicker",
    file: "date-picker.tsx",
    group: "Dates",
    keyboard: [
      ["← → ↑ ↓", "Moves a day or a week"],
      ["Page Up / Down", "Previous or next month"],
      ["Enter", "Picks the day"],
      ["Esc", "Closes the calendar"],
    ],
    description:
      "A calendar in a popover. Click the month title to jump years (dates of birth). Values are YYYY-MM-DD days, never shifted by timezone. Inside a Field, pass group; with React Hook Form use Controller.",
    props: "name?; value?; defaultValue?; onChange?; min?; max?; placeholder?; invalid?; disabled?; label?",
    example: '<DatePicker name="dob" label="Date of birth" max={today} />',
  },

  // Overlays
  {
    name: "Dialog",
    file: "dialog.tsx",
    group: "Overlays",
    keyboard: [
      ["Esc", "Closes"],
      ["Tab", "Stays inside the dialog"],
    ],
    description:
      'A modal on the native <dialog>, or a side sheet with side="end". Inside a <form>, a submit button in footer submits it.',
    props: 'trigger; title; description?; children?; footer?; size?: "sm" | "md" | "lg"; side?: "center" | "end"',
    example:
      '<Dialog trigger={<Button type="button">Edit</Button>} title="Edit customer" footer={<Button variant="primary">Save</Button>}>…</Dialog>',
  },
  {
    name: "AlertDialog",
    file: "alert-dialog.tsx",
    group: "Overlays",
    keyboard: [
      ["Esc", "Cancels"],
      ["Enter", "Confirms when Confirm has focus"],
    ],
    description:
      "Asks before something that can't be undone. Put it inside the <form> of the server action; Confirm submits it.",
    props: 'trigger; title; description?; children?; confirmLabel; tone?: "danger" | "primary"',
    example:
      '<form action={cancelPolicy}><Hidden name="policyId" value={id} /><AlertDialog trigger={…} title="Cancel this policy?" confirmLabel="Cancel policy" /></form>',
  },
  {
    name: "Popover",
    file: "popover.tsx",
    group: "Overlays",
    keyboard: [["Esc", "Closes"]],
    description: "Rich content that opens next to its trigger: a filter, a quick form, details.",
    props: 'trigger; children; align?: "start" | "end"; label',
    example: '<Popover label="Filters" trigger={<Button>Filters</Button>}>…</Popover>',
  },
  {
    name: "Tooltip",
    file: "tooltip.tsx",
    group: "Overlays",
    description:
      "A short label on hover or keyboard focus for icon buttons and truncated text. Pure CSS, works in server components.",
    props: 'content: string; side?: "top" | "bottom" | "start" | "end"',
    example: '<Tooltip content="Copy"><Button size="sm" aria-label="Copy"><Icon name="copy" /></Button></Tooltip>',
  },

  // Menus
  {
    name: "DropdownMenu",
    file: "dropdown-menu.tsx",
    group: "Menus",
    keyboard: [
      ["↑ ↓", "Moves between items"],
      ["→", "Opens a submenu"],
      ["←", "Closes a submenu"],
      ["Enter", "Runs the item"],
      ["Esc", "Closes the menu"],
    ],
    description:
      "Actions behind a button: icons, shortcuts, checks, labels, separators, danger items and submenus. Items can link, run code or submit a form by id.",
    props: 'trigger; items: MenuItem[]; align?: "start" | "end"; label',
    example:
      '<DropdownMenu label="Lead actions" trigger={…} items={[{ label: "Edit", icon: "edit" }, { type: "separator" }, { label: "Delete", danger: true }]} />',
  },
  {
    name: "ActionBar",
    file: "action-bar.tsx",
    group: "Menus",
    description:
      "Bulk actions that rise from the bottom while table rows are checked, with the count and a clear button.",
    props: "form: form id; name: checkbox name; children: the actions",
    example:
      '<ActionBar form="lead-select" name="ids"><Button form="lead-select" formAction={bulkAssign}>Assign</Button></ActionBar>',
  },

  // Navigation
  {
    name: "Tabs",
    file: "tabs.tsx",
    group: "Navigation",
    description:
      "Underlined tabs for sections of one record or a list's filter, driven by the URL. Counts show as chips.",
    props: "tabs: { id; label; href; count? }[]; current; label",
    example: '<Tabs current={tab} label="Sections" tabs={…} />',
  },
  {
    name: "PillNav",
    file: "pill-nav.tsx",
    group: "Navigation",
    description:
      "Pick one of a few views, e.g. a product. DataTable uses it for its filters; segment is a compact switch (the dashboard period).",
    props: 'items: { href; label; active }[]; label; variant?: "pills" | "segment"',
    example: '<PillNav label="Product" items={PRODUCTS.map(…)} />',
  },

  // Feedback
  {
    name: "Alert",
    file: "alert.tsx",
    group: "Feedback",
    description: "A message inside the page that stays: a warning on a record, a tip, a failed check.",
    props: 'tone?: "info" | "success" | "warning" | "danger"; title; children?; action?; className? (layout only)',
    example: '<Alert tone="warning" title="KYC expires in 5 days" />',
  },
  {
    name: "Toast",
    file: "toast.tsx",
    group: "Feedback",
    description:
      "Short confirmation in the corner after an action; leaves after five seconds. Forms using useActionForm show one on save.",
    props: 'useToast()({ title; description?; tone?: "success" | "error" | "info" })',
    example: 'const toast = useToast(); toast({ title: t("common.saved") });',
  },
  {
    name: "EmptyState",
    file: "empty-state.tsx",
    group: "Feedback",
    description: "Nothing to show: an icon, what is missing, why, and the next step.",
    props: "title; description?; icon?: IconName; action?",
    example: '<EmptyState icon="shield" title="Nothing to renew" action={<ButtonLink …/>} />',
  },
  {
    name: "Skeleton",
    file: "skeleton.tsx",
    group: "Feedback",
    description: "Grey shapes with a shimmer while a page loads; use in loading.tsx in the shape of the real content.",
    props: 'shape?: "line" | "title" | "avatar" | "badge" | "block" | "control"; className? (width only)',
    example: '<Skeleton shape="title" className="w-48" />',
  },
  {
    name: "Spinner",
    file: "spinner.tsx",
    group: "Feedback",
    description: "Something is working and the wait is short. For whole sections use Skeleton.",
    props: 'size?: "sm" | "md" | "lg"; label',
    example: '<Spinner size="sm" label="Saving" />',
  },
  {
    name: "Progress",
    file: "progress.tsx",
    group: "Feedback",
    description:
      "A share of a total on the native <progress>. With label it shows the percentage; without, it is a plain bar.",
    props: 'value; max?: 100; label?; tone?: "brand" | "neutral" | "risk" | "info"',
    example: '<Progress label="Documents collected" value={3} max={5} />',
  },
  {
    name: "Forbidden",
    file: "forbidden.tsx",
    group: "Feedback",
    description: "Replaces a page when the role lacks the permission.",
    props: "permission: Permission",
    example: '<Forbidden permission="kyc:review" />',
  },

  // Layout
  {
    name: "PageHeader",
    file: "page-header.tsx",
    group: "Layout",
    description: "The top of every page: title, one-line description, optional back link and main action.",
    props: "title; badges?; description?; action?; back?: { href; label }",
    example: '<PageHeader title="Leads" description="…" action={<ButtonLink …/>} />',
  },
  {
    name: "Panel",
    file: "panel.tsx",
    group: "Layout",
    description: "A titled section of a page. Use flush for tables, lists and tabs; footer for an add form.",
    props: "title?; description?; actions?; footer?; flush?; collapsible?: folds on phones; summary?; children",
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
      "Every list: columns, search (?q=), filters as pills or counted tabs (?filter=), dropdown and on/off filters, pagination (?page=) and an empty state, all server-side. Rows can be links; columns give way by priority; on phones rows become stacked cards.",
    props:
      'rows; columns: Column[] (key; header; cell; align?; nowrap?; numeric?: end-aligned tabular amounts; priority?: 1 | 2 | 3); rowKey; path; params?; search?; filters?: { label; options: { value; label; count? }[]; variant?: "pills" | "tabs"; total? }; refine?: { selects?; toggles? }; pagination?; empty; minWidth?; embedded?; select?; rowHref?: (row) => string; mobile?: "rows" with summary: (row) => { title; amount?; meta?; badges?; date? }',
    example:
      '<DataTable path="/leads" params={params} rows={rows} columns={[…]} pagination={{ page, pageSize, total }} />',
  },
  {
    name: "TableFilters",
    file: "table-filters.tsx",
    group: "Data",
    description:
      "Dropdown and on/off filters that go straight to the URL. DataTable renders it from its refine prop; use that.",
    props: "path; params; selects?: { name; label; placeholder; options }[]; toggles?: { name; label }[]",
    example: '<DataTable refine={{ toggles: [{ name: "paid", label: "Paid online only" }] }} … />',
  },
  {
    name: "CellText",
    file: "cell-text.tsx",
    group: "Data",
    description: "Two-line text for a table cell or list row that truncates instead of overflowing; optional link.",
    props: "primary; secondary?; href?",
    example: "<CellText href={leadPath(lead.publicId)} primary={name} secondary={lead.reference} />",
  },
  {
    name: "ListRow",
    file: "list-row.tsx",
    group: "Data",
    description:
      "One row of a simple list inside a flush Panel, with an action at the end. With href the row is a link.",
    props: "children; action?; muted?; href?",
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
    name: "PriceBreakdown",
    file: "price-breakdown.tsx",
    group: "Data",
    description:
      "What a price is made of: one line per part (plan, add-ons, discount) and the total under a rule. Amounts come formatted.",
    props: 'caption; lines: { label; amount; tone?: "included" | "minus" }[]; total: { label; amount }',
    example:
      '<PriceBreakdown caption="Price breakdown" lines={[{ label: "Plan, 1 year", amount: money(1110) }]} total={{ label: "Total a year", amount: money(1140) }} />',
  },
  {
    name: "Stat",
    file: "stat.tsx",
    group: "Data",
    description:
      "A headline number with its label, optionally a link. Can carry a comparison line, a hint, a badge and an action.",
    props: "label; value; href?; hint?; delta?: { value: percent; label }; badge?; action?: link text",
    example:
      '<Stat label="Premium written" value="$21,105" delta={{ value: 12, label: "vs same point in October" }} />',
  },
  {
    name: "Timeline",
    file: "timeline.tsx",
    group: "Data",
    description: "Events joined by a line: the audit trail, a policy's history.",
    props: "items: { id; title; description?; time; icon?; tone? }[]",
    example: "<Timeline items={logs.map((l) => ({ id: l.id, title: l.action, time: dateTime(l.at) }))} />",
  },

  // Media
  {
    name: "Avatar",
    file: "avatar.tsx",
    group: "Media",
    description: "A person's initials in a circle; the colour comes from the name, so it is the same everywhere.",
    props: 'name; size?: "sm" | "md" | "lg"; status?: "online" | "away" | "offline"; ring?',
    example: '<Avatar name={lead.advisorName} size="sm" />',
  },
  {
    name: "AvatarGroup",
    file: "avatar-group.tsx",
    group: "Media",
    description: "A team as overlapping avatars; names on hover and the rest as +N.",
    props: "names: string[]; max?: 4; size?",
    example: "<AvatarGroup names={team.map((u) => u.name)} max={3} />",
  },
  {
    name: "Icon",
    file: "icon.tsx",
    group: "Media",
    description: "Our own icon set. Add icons in icon.tsx, never from a package.",
    props: "name: IconName; size?; className?",
    example: '<Icon name="shield" />',
  },

  // Effects
  {
    name: "MotionHighlight",
    file: "motion-highlight.tsx",
    group: "Effects",
    description:
      "One background that glides to the hovered or focused child and rests on the active one (aria-current). Used by the sidebar.",
    props: "children; className? (layout only)",
    example: '<MotionHighlight className="flex gap-1">{links}</MotionHighlight>',
  },
  {
    name: "NumberTicker",
    file: "number-ticker.tsx",
    group: "Effects",
    description: "Counts up to a number when it scrolls into view. Shows the final number at once for reduced motion.",
    props: 'value: number; format?: "number" | "money" | "percent"',
    example: "<NumberTicker value={stats.activePolicies} />",
  },
  {
    name: "SpotlightCard",
    file: "spotlight-card.tsx",
    group: "Effects",
    description: "A card with a glow that follows the pointer. One per page at most.",
    props: "children; className? (layout only)",
    example: "<SpotlightCard>…</SpotlightCard>",
  },
  {
    name: "ShimmerText",
    file: "shimmer-text.tsx",
    group: "Effects",
    description: "Text with a light sweeping across it while something is being worked on.",
    props: "children",
    example: "<ShimmerText>Screening customer…</ShimmerText>",
  },
];
