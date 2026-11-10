import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon, MotionHighlight, NumberTicker, ShimmerText, SpotlightCard } from "@/components/ui";
import { Demo, type DemoProps } from "../demo";

/** Motion used sparingly: one highlight, one count-up, one glow, one shimmer. */
export function EffectDemos({ name, path }: DemoProps) {
  const t = useTranslations();

  switch (name) {
    case "MotionHighlight":
      return (
        <>
          <Demo title="Row of links" description="The background rests on the active link and follows the pointer.">
            <MotionHighlight tone="white" className="flex flex-wrap gap-1">
              {(["dashboard", "opportunities", "leads", "policies"] as const).map((key, i) => (
                <Link
                  key={key}
                  href={path}
                  aria-current={i === 2 ? "page" : undefined}
                  className="rounded-lg px-3 py-1.5 text-sm text-ink-soft hover:text-ink aria-[current]:font-medium aria-[current]:text-ink"
                >
                  {t(`nav.${key}`)}
                </Link>
              ))}
            </MotionHighlight>
          </Demo>
          <Demo title="List">
            <MotionHighlight tone="white" className="grid max-w-xs gap-0.5">
              {(["car", "health", "travel"] as const).map((p) => (
                <Link key={p} href={path} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm">
                  <Icon name="shield" size={16} className="text-muted" />
                  {t(`products.${p}`)}
                </Link>
              ))}
            </MotionHighlight>
          </Demo>
        </>
      );
    case "NumberTicker":
      return (
        <Demo title="Formats" description="Counts up once when it scrolls into view.">
          <div className="flex flex-wrap gap-8 text-3xl font-semibold tracking-tight">
            <NumberTicker value={1284} />
            <NumberTicker value={482300} format="money" />
            <NumberTicker value={67} format="percent" />
          </div>
        </Demo>
      );
    case "SpotlightCard":
      return (
        <Demo title="Featured block" description="Move the pointer over the card.">
          <SpotlightCard className="max-w-sm">
            <p className="text-sm text-muted">{t("dashboard.annualPremium")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              <NumberTicker value={482300} format="money" />
            </p>
          </SpotlightCard>
        </Demo>
      );
    case "ShimmerText":
      return (
        <Demo title="Working on it">
          <p className="text-sm font-medium">
            <ShimmerText>{t("lead.kyc.submitting")}</ShimmerText>
          </p>
        </Demo>
      );
    default:
      return null;
  }
}
