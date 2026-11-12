import { getTranslations } from "next-intl/server";
import { Autocomplete, Button, Dialog, DropdownMenu, Field, Hidden, Icon, type MenuItem } from "@/components/ui";
import { EDITABLE_LEAD_STAGES } from "@/constants/statuses";
import { keyedOptions } from "@/lib/options";
import { can, scopeOf } from "@/lib/rbac";
import { updateLead } from "@/server/actions/leads";
import { getLeadContext } from "@/server/queries/lead-details";
import { usersWithPermission } from "@/server/queries/users";

/**
 * The lead header's buttons: one dialog for the stage and the advisor (each field only when the user may change it)
 * and a More menu. Closed leads show only the menu.
 */
export async function LeadActions({ leadId, tab }: { leadId: number; tab: string }) {
  const [{ user, lead, opportunity, closed }, t] = await Promise.all([getLeadContext(leadId), getTranslations()]);
  const canStage = can(user, "leads:edit") && !closed;
  const advisors =
    can(user, "leads:assign") && !closed ? await usersWithPermission(lead.departmentId, "quotes:create") : [];

  const menu: MenuItem[] = [
    { label: t("lead.menu.allActivity"), icon: "scroll", href: `?tab=${tab}&activity=all#activity` },
  ];
  if (scopeOf(user, "opportunities") !== "none") {
    menu.unshift({
      label: t("lead.menu.openOpportunity", { id: opportunity.id }),
      icon: "inbox",
      href: `/opportunities/${opportunity.id}`,
    });
  }

  return (
    <div className="flex gap-2">
      {(canStage || advisors.length > 0) && (
        <form action={updateLead}>
          <Hidden name="leadId" value={lead.id} />
          <Dialog
            trigger={
              <Button type="button">
                <Icon name="edit" size={15} />
                {t("lead.changeStageOrAdvisor")}
              </Button>
            }
            title={t("lead.changeStageOrAdvisor")}
            description={t("lead.editDescription")}
            closeLabel={t("common.close")}
            footer={
              <>
                <Button type="button" variant="ghost" data-dialog-close>
                  {t("common.cancel")}
                </Button>
                <Button variant="primary">{t("lead.saveChanges")}</Button>
              </>
            }
          >
            <div className="grid gap-4">
              {canStage && (
                <Field label={t("leads.stage")}>
                  <Autocomplete
                    name="stage"
                    defaultValue={lead.stage}
                    placeholder={t("placeholders.stage")}
                    options={keyedOptions(t, "status", EDITABLE_LEAD_STAGES)}
                  />
                </Field>
              )}
              {advisors.length > 0 && (
                <Field label={t("leads.advisor")}>
                  <Autocomplete
                    name="advisorId"
                    defaultValue={lead.advisorId ?? ""}
                    placeholder={t("placeholders.advisor")}
                    options={advisors.map((a) => ({ value: String(a.id), label: a.name }))}
                  />
                </Field>
              )}
            </div>
          </Dialog>
        </form>
      )}
      <DropdownMenu
        label={t("lead.moreActions")}
        align="end"
        items={menu}
        trigger={
          <Button type="button" aria-label={t("lead.moreActions")}>
            <Icon name="more" size={16} />
          </Button>
        }
      />
    </div>
  );
}
