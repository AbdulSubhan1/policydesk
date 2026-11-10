import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { RENEWAL_WINDOW_DAYS } from "@/constants/config";
import { shortDate } from "@/lib/format";

type Renewal = { id: number; policyNumber: string; endDate: string; customerName: string; leadId: number };

export function RenewalsCard({ renewals }: { renewals: Renewal[] }) {
  const t = useTranslations("dashboard");
  return (
    <Card>
      <CardHeader title={t("renewals")} description={t("renewalsHint", { days: RENEWAL_WINDOW_DAYS })} />
      {renewals.length === 0 ? (
        <EmptyState title={t("noRenewals")} />
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
    </Card>
  );
}
