import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { getTimeline } from "@/server/queries/lead-details";

/** The lead's own audit trail, newest first. */
export async function ActivityFeed({ leadId }: { leadId: number }) {
  const [timeline, t] = await Promise.all([getTimeline(leadId), getTranslations()]);
  if (timeline.length === 0) return <EmptyState title={t("lead.noActivity")} />;

  return (
    <ol className="grid gap-4 px-5 py-4">
      {timeline.map((entry) => {
        const key = `activity.${entry.entity}.${entry.action}`;
        return (
          <li key={entry.id} className="grid grid-cols-[8px_1fr] gap-3 text-sm">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-brand" aria-hidden />
            <div className="min-w-0">
              <p>
                <span className="font-medium">{entry.userName ?? t("lead.system")}</span>{" "}
                {t.has(key) ? t(key) : t("activity.other", { action: entry.action, entity: entry.entity })}
              </p>
              {entry.details && <p className="[overflow-wrap:anywhere] text-muted">{entry.details}</p>}
              <p className="text-xs text-muted">{dateTime(entry.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
