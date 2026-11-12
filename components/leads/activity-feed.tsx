import { getTranslations } from "next-intl/server";
import { EmptyState, PanelSection, Timeline, type IconName, type TimelineItem } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { getTimeline } from "@/server/queries/lead-details";

// How each kind of record looks on the trail
const ENTITY: Record<string, { icon: IconName; tone: TimelineItem["tone"] }> = {
  opportunity: { icon: "inbox", tone: "info" },
  lead: { icon: "clipboard", tone: "info" },
  quote: { icon: "send", tone: "warn" },
  kyc: { icon: "shield", tone: "warn" },
  document: { icon: "upload", tone: "muted" },
  policy: { icon: "badgeCheck", tone: "brand" },
  payment: { icon: "check", tone: "brand" },
  order: { icon: "globe", tone: "brand" },
  renewal: { icon: "scroll", tone: "brand" },
};

/** The lead's own audit trail, newest first; `limit` keeps only the latest events. */
export async function ActivityFeed({ leadId, limit }: { leadId: number; limit?: number }) {
  const [all, t] = await Promise.all([getTimeline(leadId), getTranslations()]);
  if (all.length === 0) return <EmptyState title={t("lead.noActivity")} />;
  const timeline = limit === undefined ? all : all.slice(0, limit);

  return (
    <PanelSection>
      <Timeline
        items={timeline.map((entry) => {
          const key = `activity.${entry.entity}.${entry.action}`;
          return {
            id: entry.id,
            icon: ENTITY[entry.entity]?.icon,
            tone: ENTITY[entry.entity]?.tone,
            title: (
              <>
                {entry.userName ?? t("audit.website")}{" "}
                <span className="font-normal text-ink-soft">
                  {t.has(key) ? t(key) : t("activity.other", { action: entry.action, entity: entry.entity })}
                </span>
              </>
            ),
            description: entry.details,
            time: dateTime(entry.createdAt),
          };
        })}
      />
    </PanelSection>
  );
}
