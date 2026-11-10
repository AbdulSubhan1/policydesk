import { useTranslations } from "next-intl";
import {
  ActionBar,
  AlertDialog,
  Avatar,
  Button,
  Checkbox,
  DetailList,
  Dialog,
  DropdownMenu,
  Field,
  Icon,
  Input,
  Popover,
  Tooltip,
} from "@/components/ui";
import { Demo, type DemoProps } from "../demo";

const PEOPLE = ["Ahmed Rahman", "Layla Haddad", "John Smith", "Priya Patel"];

/** Dialogs, sheets, popovers, tooltips, menus and the bulk action bar. */
export function OverlayDemos({ name, path }: DemoProps) {
  const t = useTranslations();

  switch (name) {
    case "Dialog":
      return (
        <>
          <Demo title="Form in a dialog" description="The footer's submit button submits the form around the dialog.">
            <form action={path}>
              <Dialog
                trigger={
                  <Button type="button">
                    <Icon name="edit" size={15} />
                    {t("lead.customerCard")}
                  </Button>
                }
                title={t("lead.customerCard")}
                description="Ahmed Rahman"
                closeLabel={t("common.close")}
                footer={
                  <>
                    <Button type="button" data-dialog-close>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" variant="primary">
                      {t("common.save")}
                    </Button>
                  </>
                }
              >
                <div className="grid gap-3">
                  <Field label={t("opportunities.customerName")}>
                    <Input name="demo-name" defaultValue="Ahmed Rahman" />
                  </Field>
                  <Field label={t("opportunities.email")}>
                    <Input type="email" placeholder={t("placeholders.email")} />
                  </Field>
                </div>
              </Dialog>
            </form>
          </Demo>
          <Demo title="Sheet" description='side="end" slides in from the side, for details that keep the list in view.'>
            <Dialog
              trigger={<Button type="button">{t("common.view")}</Button>}
              title="Lead #34"
              side="end"
              closeLabel={t("common.close")}
            >
              <DetailList
                items={[
                  { label: t("leads.customer"), value: "Ahmed Rahman" },
                  { label: t("leads.product"), value: t("products.car") },
                  { label: t("leads.advisor"), value: "Aisha Khan" },
                ]}
              />
            </Dialog>
          </Demo>
        </>
      );
    case "AlertDialog":
      return (
        <>
          <Demo title="Destructive" description="Confirm submits the form the dialog sits in.">
            <form action={path}>
              <AlertDialog
                trigger={
                  <Button type="button" variant="danger">
                    {t("lead.policy.cancelPolicy")}
                  </Button>
                }
                title={`${t("lead.policy.cancelPolicy")}?`}
                confirmLabel={t("lead.policy.cancelPolicy")}
              />
            </form>
          </Demo>
          <Demo title="Neutral">
            <form action={path}>
              <AlertDialog
                tone="primary"
                trigger={<Button type="button">{t("common.deactivate")}</Button>}
                title={`${t("common.deactivate")}?`}
                description="They can be activated again later."
                confirmLabel={t("common.deactivate")}
              />
            </form>
          </Demo>
        </>
      );
    case "Popover":
      return (
        <Demo title="Quick details" description="Escape or a click outside closes it.">
          <Popover label={t("leads.advisor")} trigger={<Button type="button">{t("leads.advisor")}</Button>}>
            <div className="flex items-center gap-3">
              <Avatar name="Aisha Khan" status="online" />
              <div className="min-w-0 text-sm">
                <p className="font-medium">Aisha Khan</p>
                <p className="text-muted">{t("departments.motor_marine")}</p>
              </div>
            </div>
          </Popover>
        </Demo>
      );
    case "Tooltip":
      return (
        <Demo title="Sides" description="Hover or tab onto each button.">
          <div className="flex flex-wrap gap-3 py-6">
            {(["top", "bottom", "start", "end"] as const).map((side) => (
              <Tooltip key={side} content={`side="${side}"`} side={side}>
                <Button size="sm">{side}</Button>
              </Tooltip>
            ))}
          </div>
        </Demo>
      );
    case "DropdownMenu":
      return (
        <>
          <Demo title="Icons, shortcuts and a danger item">
            <DropdownMenu
              label={t("leads.title")}
              trigger={
                <Button type="button">
                  {t("lead.setStage")}
                  <Icon name="chevronDown" size={15} />
                </Button>
              }
              items={[
                { type: "label", label: "Lead #34" },
                { label: t("common.view"), icon: "eye", shortcut: "⌘O", href: path },
                { label: t("lead.customerCard"), icon: "edit", shortcut: "⌘E" },
                { label: t("common.add"), icon: "copy", shortcut: "⌘D" },
                { type: "separator" },
                { label: t("common.delete"), icon: "trash", danger: true },
              ]}
            />
          </Demo>
          <Demo title="Submenu and checks" description="Hover or press → on a row with an arrow.">
            <DropdownMenu
              label={t("leads.stage")}
              trigger={
                <Button type="button" variant="ghost" aria-label={t("leads.stage")}>
                  <Icon name="more" size={18} />
                </Button>
              }
              items={[
                {
                  label: t("lead.setStage"),
                  icon: "send",
                  items: (["needs_analysis", "quoted", "kyc", "lost"] as const).map((s) => ({
                    label: t(`status.${s}`),
                    checked: s === "quoted",
                  })),
                },
                {
                  label: t("common.language"),
                  icon: "globe",
                  items: [
                    { label: t("common.english"), checked: true },
                    { label: t("common.arabic"), checked: false },
                  ],
                },
                { type: "separator" },
                { label: t("common.disable"), disabled: true },
              ]}
            />
          </Demo>
        </>
      );
    case "ActionBar":
      return (
        <Demo
          title="Bulk selection"
          description="Tick a row: the bar rises at the bottom of the screen with the count."
        >
          <form id="demo-bulk" action={path} className="grid gap-2">
            {PEOPLE.map((p) => (
              <Checkbox key={p} name="ids" value={p} label={p} />
            ))}
            <ActionBar form="demo-bulk" name="ids">
              <Button type="button" size="sm" variant="ghost">
                <Icon name="send" size={15} />
                {t("lead.setStage")}
              </Button>
              <AlertDialog
                trigger={
                  <Button type="button" size="sm" variant="ghost">
                    <Icon name="trash" size={15} />
                    {t("common.delete")}
                  </Button>
                }
                title={`${t("common.delete")}?`}
                confirmLabel={t("common.delete")}
              />
            </ActionBar>
          </form>
        </Demo>
      );
    default:
      return null;
  }
}
