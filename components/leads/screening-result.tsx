import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui";

type Screening = {
  riskRating: string | null;
  isPep: boolean;
  watchlistMatch: boolean;
  eddRequired: boolean;
  riskReasons: string[];
};

/** Risk rating, flags and the reasons behind them. Used on the lead page and in the compliance queue. */
export function ScreeningResult({ kyc }: { kyc: Screening }) {
  const t = useTranslations("lead.kyc");
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5">
        {kyc.riskRating && <Badge status={kyc.riskRating} />}
        {kyc.isPep && <Badge tone="red">{t("pep")}</Badge>}
        {kyc.watchlistMatch && <Badge tone="red">{t("watchlist")}</Badge>}
        {kyc.eddRequired && <Badge tone="amber">{t("edd")}</Badge>}
      </div>
      {kyc.riskReasons.length > 0 && (
        <ul className="list-disc ps-5 text-sm text-ink-soft">
          {kyc.riskReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
