import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ButtonLink, Panel } from "@/components/ui";
import { scopeOf } from "@/lib/rbac";
import { getLeadContext } from "@/server/queries/lead-details";

/** Who the customer is and one tap to reach them: call, email or WhatsApp. */
export async function ContactCard({ leadId, className }: { leadId: number; className?: string }) {
  const [{ user, opportunity }, t] = await Promise.all([getLeadContext(leadId), getTranslations()]);
  const opportunityLabel = t("lead.opportunityNumber", { id: opportunity.id });

  return (
    <Panel title={t("lead.contact.title")} className={className}>
      <div className="grid gap-3 text-sm">
        <div className="min-w-0">
          <p className="[overflow-wrap:anywhere] text-ink">{opportunity.email}</p>
          <p className="text-ink" dir="ltr">
            {opportunity.phone}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ButtonLink href={`tel:${opportunity.phone}`} size="sm">
            {t("lead.contact.call")}
          </ButtonLink>
          <ButtonLink href={`mailto:${opportunity.email}`} size="sm">
            {t("lead.contact.email")}
          </ButtonLink>
          <ButtonLink
            href={`https://wa.me/${opportunity.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            {t("lead.contact.whatsapp")}
          </ButtonLink>
        </div>
        <p className="text-xs text-muted">
          {t("lead.contact.cameFrom", { source: t(`sources.${opportunity.source}`) })} ·{" "}
          {scopeOf(user, "opportunities") === "none" ? (
            opportunityLabel
          ) : (
            <Link href={`/opportunities/${opportunity.id}`} className="font-medium text-brand hover:underline">
              {opportunityLabel}
            </Link>
          )}
        </p>
      </div>
    </Panel>
  );
}
