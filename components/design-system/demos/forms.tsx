import { useTranslations } from "next-intl";
import {
  Autocomplete,
  Button,
  ButtonLink,
  DatePicker,
  Field,
  FileUpload,
  FormError,
  Icon,
  InlineForm,
  Input,
  NumberInput,
  OtpInput,
  PasswordInput,
  PhoneInput,
  Textarea,
  Tooltip,
} from "@/components/ui";
import { LEAD_STAGES } from "@/constants/statuses";
import { keyedOptions } from "@/lib/options";
import { Demo, type DemoProps } from "../demo";
import { ValidationDemo } from "../validation-demo";

/** Buttons, form plumbing, text inputs and dates. */
export function FormDemos({ name, path }: DemoProps) {
  const t = useTranslations();
  const today = new Date().toISOString().slice(0, 10);

  switch (name) {
    case "Button":
      return (
        <>
          <Demo
            title="Variants"
            description="Primary for the one main action, danger for destructive ones, ghost for quiet ones."
          >
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">{t("lead.policy.book")}</Button>
              <Button>{t("common.save")}</Button>
              <Button variant="danger">{t("lead.policy.cancelPolicy")}</Button>
              <Button variant="ghost">{t("common.disable")}</Button>
            </div>
          </Demo>
          <Demo title="Sizes and icons">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">
                <Icon name="plus" size={15} />
                {t("common.add")}
              </Button>
              <Button>
                <Icon name="send" size={16} />
                {t("lead.setStage")}
              </Button>
              <Tooltip content={t("common.delete")}>
                <Button size="sm" variant="ghost" aria-label={t("common.delete")}>
                  <Icon name="trash" size={16} />
                </Button>
              </Tooltip>
            </div>
          </Demo>
          <Demo title="Disabled">
            <Button disabled>{t("common.save")}</Button>
          </Demo>
        </>
      );
    case "ButtonLink":
      return (
        <Demo title="Basic" description="Looks like a button, navigates like a link.">
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={path} variant="primary">
              {t("opportunities.openLead")}
            </ButtonLink>
            <ButtonLink href={path}>{t("common.back")}</ButtonLink>
          </div>
        </Demo>
      );
    case "Field":
      return (
        <Demo
          title="Shared validation"
          description="Every form uses these rules from schemas/fields.ts. Type to see them work."
        >
          <ValidationDemo />
        </Demo>
      );
    case "InlineForm":
      return (
        <Demo title="One-click action" description="A choice and a button on one line, for a server action.">
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
        </Demo>
      );
    case "FormError":
      return (
        <Demo title="From a server action">
          <FormError message="errors.invalidLogin" />
        </Demo>
      );
    case "Hidden":
      return (
        <Demo
          title="Invisible"
          description="Renders an input with no visual output; this space is intentionally empty."
        >
          <span className="text-sm text-muted">{'<input type="hidden" name="leadId" value="42">'}</span>
        </Demo>
      );
    case "Input":
      return (
        <>
          <Demo title="Text and email">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("opportunities.customerName")}>
                <Input placeholder={t("placeholders.customerName")} />
              </Field>
              <Field label={t("opportunities.email")} hint="name@example.com">
                <Input type="email" placeholder={t("placeholders.email")} />
              </Field>
            </div>
          </Demo>
          <Demo title="Invalid and disabled">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("opportunities.email")} error="validation.email">
                <Input type="email" defaultValue="ahmed@" aria-invalid />
              </Field>
              <Field label={t("plans.basePremium")}>
                <Input placeholder={t("placeholders.premium")} disabled />
              </Field>
            </div>
          </Demo>
        </>
      );
    case "PasswordInput":
      return (
        <Demo title="Show and hide" description="The eye button reveals what was typed.">
          <div className="max-w-sm">
            <Field label={t("login.password")}>
              <PasswordInput defaultValue="demo1234" autoComplete="off" />
            </Field>
          </div>
        </Demo>
      );
    case "NumberInput":
      return (
        <>
          <Demo title="Stepper" description="Steps by 50 within 0 and 10,000.">
            <div className="max-w-xs">
              <Field label={t("plans.basePremium")}>
                <NumberInput min={0} max={10000} step={50} defaultValue={1200} />
              </Field>
            </div>
          </Demo>
          <Demo title="Disabled">
            <div className="max-w-xs">
              <NumberInput aria-label={t("plans.basePremium")} defaultValue={3} disabled />
            </div>
          </Demo>
        </>
      );
    case "PhoneInput":
      return (
        <>
          <Demo title="Changeable country">
            <div className="max-w-sm">
              <Field label={t("opportunities.phone")} group>
                <PhoneInput aria-label={t("opportunities.phone")} defaultValue="+971501234567" />
              </Field>
            </div>
          </Demo>
          <Demo title="Locked country" description="lockCountry keeps the code fixed, here Pakistan.">
            <div className="max-w-sm">
              <Field label={t("opportunities.phone")} group>
                <PhoneInput aria-label={t("opportunities.phone")} defaultCountry="PK" lockCountry />
              </Field>
            </div>
          </Demo>
        </>
      );
    case "OtpInput":
      return (
        <>
          <Demo title="Six digits" description="Paste 123456 to fill every box at once.">
            <OtpInput name="code" label="Code" />
          </Demo>
          <Demo title="Four digits">
            <OtpInput name="pin" length={4} label="PIN" />
          </Demo>
        </>
      );
    case "Textarea":
      return (
        <Demo title="Notes">
          <Textarea rows={3} placeholder={t("placeholders.notes")} />
        </Demo>
      );
    case "FileUpload":
      return (
        <>
          <Demo title="Single file" description="Drop a file or click; the chosen file shows below with its size.">
            <FileUpload accept=".pdf,.jpg,.png" hint="PDF, JPG or PNG up to 2 MB" />
          </Demo>
          <Demo title="Several files">
            <FileUpload multiple hint="Up to 2 MB each" />
          </Demo>
        </>
      );
    case "DatePicker":
      return (
        <>
          <Demo title="Basic" description="Arrow keys move by day and week; Page Up and Page Down change month.">
            <div className="max-w-xs">
              <DatePicker label={t("lead.kyc.idExpiry")} />
            </div>
          </Demo>
          <Demo
            title="Date of birth"
            description="Click the month title to jump between years. Future days are disabled."
          >
            <div className="max-w-xs">
              <DatePicker label={t("lead.kyc.dateOfBirth")} defaultValue="1990-05-14" max={today} />
            </div>
          </Demo>
          <Demo title="Invalid">
            <div className="max-w-xs">
              <DatePicker label={t("lead.policy.paidOn")} invalid />
            </div>
          </Demo>
        </>
      );
    default:
      return null;
  }
}
