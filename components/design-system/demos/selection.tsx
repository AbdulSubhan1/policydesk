import { useTranslations } from "next-intl";
import {
  Autocomplete,
  Checkbox,
  Field,
  MultiSelect,
  Radio,
  RadioGroup,
  Rating,
  SegmentGroup,
  Switch,
} from "@/components/ui";
import { LEAD_STAGES } from "@/constants/statuses";
import { coverOptions, keyedOptions, productOptions } from "@/lib/options";
import { Demo, type DemoProps } from "../demo";

const FUNDS = ["salary", "business", "savings", "investments", "cash"] as const;
const METHODS = ["card", "bank_transfer", "cheque"] as const;

/** Every way to choose: dropdowns, checks, radios, switches, segments and stars. */
export function SelectionDemos({ name }: DemoProps) {
  const t = useTranslations();

  switch (name) {
    case "Autocomplete":
      return (
        <>
          <Demo title="Groups and search" description="Products grouped by department; type to filter.">
            <div className="max-w-sm">
              <Field label={t("opportunities.product")}>
                <Autocomplete options={productOptions(t)} placeholder={t("placeholders.product")} />
              </Field>
            </div>
          </Demo>
          <Demo title="With a value">
            <div className="max-w-sm">
              <Autocomplete
                aria-label={t("leads.stage")}
                options={keyedOptions(t, "status", LEAD_STAGES)}
                defaultValue="quoted"
              />
            </div>
          </Demo>
        </>
      );
    case "MultiSelect":
      return (
        <>
          <Demo title="Tags" description="Pick several covers; Backspace removes the last tag.">
            <div className="max-w-md">
              <MultiSelect
                label="Covers"
                options={coverOptions(t, "car")}
                defaultValue={["comprehensive"]}
                placeholder={t("placeholders.cover")}
              />
            </div>
          </Demo>
          <Demo title="Empty">
            <div className="max-w-md">
              <MultiSelect
                label={t("lead.kyc.sourceOfFunds")}
                options={keyedOptions(t, "funds", FUNDS)}
                placeholder={t("placeholders.sourceOfFunds")}
              />
            </div>
          </Demo>
        </>
      );
    case "Checkbox":
      return (
        <>
          <Demo title="With hint">
            <Checkbox label={t("permissions.leads:edit")} hint="leads:edit" defaultChecked />
          </Demo>
          <Demo title="Sizes">
            <div className="grid gap-3">
              <Checkbox size="sm" label="sm" />
              <Checkbox label="md" defaultChecked />
              <Checkbox size="lg" label="lg" defaultChecked />
            </div>
          </Demo>
          <Demo title="Disabled">
            <Checkbox label={t("roles.locked")} disabled defaultChecked />
          </Demo>
        </>
      );
    case "Radio":
      return (
        <Demo title="Sizes" description="A bare radio for tables; use RadioGroup when it needs a label.">
          <div className="flex items-center gap-4">
            <Radio name="demo-radio" size="sm" aria-label="sm" />
            <Radio name="demo-radio" aria-label="md" defaultChecked />
            <Radio name="demo-radio" size="lg" aria-label="lg" />
          </div>
        </Demo>
      );
    case "RadioGroup":
      return (
        <>
          <Demo title="List">
            <RadioGroup
              name="demo-funds"
              label={t("lead.kyc.sourceOfFunds")}
              defaultValue="salary"
              options={keyedOptions(t, "funds", FUNDS.slice(0, 3))}
            />
          </Demo>
          <Demo title="Cards" description="For choices that need a line of explanation.">
            <RadioGroup
              name="demo-method"
              variant="cards"
              label={t("lead.policy.paymentMethod")}
              defaultValue="card"
              options={METHODS.map((m) => ({
                value: m,
                label: t(`paymentMethods.${m}`),
                description: t("lead.policy.reference"),
              }))}
            />
          </Demo>
        </>
      );
    case "Switch":
      return (
        <>
          <Demo title="With description">
            <Switch label={t("users.active")} description={t("users.description")} defaultChecked />
          </Demo>
          <Demo title="Sizes and disabled">
            <div className="grid gap-3">
              <Switch size="sm" label="sm" />
              <Switch label="md" defaultChecked />
              <Switch label={t("roles.locked")} disabled defaultChecked />
            </div>
          </Demo>
        </>
      );
    case "SegmentGroup":
      return (
        <Demo title="View switch">
          <SegmentGroup
            name="demo-view"
            label={t("leads.title")}
            defaultValue="all"
            options={[
              { value: "all", label: t("common.all") },
              { value: "new", label: t("status.new") },
              { value: "renewal", label: t("status.renewal") },
            ]}
          />
        </Demo>
      );
    case "Rating":
      return (
        <>
          <Demo title="Input" description="Click a star or use the arrow keys.">
            <Rating name="demo-rating" value={3} label="Service" />
          </Demo>
          <Demo title="Read only">
            <Rating value={4} label="Service" />
          </Demo>
        </>
      );
    default:
      return null;
  }
}
