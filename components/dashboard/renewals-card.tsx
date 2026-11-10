import Link from "next/link";
import { useTranslations } from "next-intl";
import { EmptyState, Panel } from "@/components/ui";
import { RENEWAL_WINDOW_DAYS } from "@/constants/config";
import { shortDate } from "@/lib/format";

type Renewal = { id: number; policyNumber: string; endDate: string; customerName: string; leadId: number };

export function RenewalsCard({ renewals }: { renewals: Renewal[] }) {
  const t = useTranslations("dashboard");
  return (
    <Panel title={t("renewals")} description={t("renewalsHint", { days: RENEWAL_WINDOW_DAYS })} flush>
      {renewals.length === 0 ? (
        <EmptyState title={t("noRenewals")} icon="shield" />
      ) : (
        <ul className="divide-y divide-line">
          {renewals.map((r) => (
            <li key={r.id}>
              <Link
                href={`/leads/${r.leadId}?tab=policy`}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-paper/60"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.customerName}</span>
                  <span className="block truncate font-mono text-xs text-muted">{r.policyNumber}</span>
                </span>
                <span className="shrink-0 text-warn">{shortDate(r.endDate)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
