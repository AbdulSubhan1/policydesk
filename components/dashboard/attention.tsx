import { useTranslations } from "next-intl";
import { Badge, Stat } from "@/components/ui";
import { RENEWAL_WINDOW_DAYS } from "@/constants/config";
import { daysSince, type AttentionCard } from "@/lib/dashboard";
import { money } from "@/lib/format";

export type AttentionCounts = {
  kyc: { waiting: number; oldest: Date | null };
  kycToSend: number;
  paymentsToRecord: { count: number; amount: number };
  paidToBook: { count: number; amount: number };
  unassigned: number;
  toQuote: number;
  renewals: number;
};

// Where each card leads: the list filtered to exactly what the card counts
const HREF: Record<AttentionCard, string> = {
  kycReview: "/kyc",
  kycToSend: "/leads?filter=kyc",
  paymentsToRecord: "/policies?filter=booked",
  paidToBook: "/leads?paid=1",
  unassigned: "/leads?advisor=none",
  toQuote: "/leads?filter=needs_analysis",
  renewals: "/policies?filter=renewal_due",
};

/** "Needs you today": one linked card per task the role can act on, with how many are waiting. */
export function Attention({ cards, counts, now }: { cards: AttentionCard[]; counts: AttentionCounts; now: Date }) {
  const t = useTranslations("dashboard");
  if (cards.length === 0) return null;

  const content = (card: AttentionCard): { value: number; badge?: React.ReactNode } => {
    switch (card) {
      case "kycReview":
        return {
          value: counts.kyc.waiting,
          badge: counts.kyc.oldest && (
            <Badge tone="amber">{t("cards.kycReview.oldest", { days: daysSince(counts.kyc.oldest, now) })}</Badge>
          ),
        };
      case "paymentsToRecord":
      case "paidToBook": {
        const { count, amount } = counts[card];
        return { value: count, badge: count > 0 && <Badge tone="green">{money(amount)}</Badge> };
      }
      case "unassigned":
        return {
          value: counts.unassigned,
          badge: counts.unassigned > 0 && <Badge tone="red">{t("cards.unassigned.badge")}</Badge>,
        };
      case "renewals":
        return {
          value: counts.renewals,
          badge: <Badge tone="blue">{t("cards.renewals.badge", { days: RENEWAL_WINDOW_DAYS })}</Badge>,
        };
      default:
        return { value: counts[card] };
    }
  };

  return (
    <section aria-labelledby="needs-today" className="mb-8">
      <h2 id="needs-today" className="mb-3 font-semibold text-ink">
        {t("today")}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const { value, badge } = content(card);
          return (
            <Stat
              key={card}
              label={t(`cards.${card}.label`)}
              value={value}
              badge={badge || undefined}
              href={HREF[card]}
              action={t(`cards.${card}.action`)}
            />
          );
        })}
      </div>
    </section>
  );
}
