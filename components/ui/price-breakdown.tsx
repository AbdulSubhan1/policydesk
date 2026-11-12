import { cn } from "@/lib/cn";

export type PriceLine = {
  label: React.ReactNode;
  /** Already formatted, e.g. "$60", "−$50" or "Included". */
  amount: React.ReactNode;
  /** included: a free part of the price; minus: money taken off, such as a discount. */
  tone?: "included" | "minus";
};

/** What a price is made of, line by line, with the total underneath. A real table, so screen readers pair the cells. */
export function PriceBreakdown({
  caption,
  lines,
  total,
}: {
  /** Read out by screen readers only, e.g. "Price breakdown for Northwind Plus". */
  caption: string;
  lines: PriceLine[];
  total: { label: string; amount: React.ReactNode };
}) {
  return (
    <table data-ui="PriceBreakdown" className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {lines.map((line, i) => (
          <tr key={i} className="border-b border-line/70 last:border-b-0">
            <th scope="row" className="py-2 pe-3 text-start font-normal text-ink">
              {line.label}
            </th>
            <td
              className={cn(
                "py-2 text-end whitespace-nowrap tabular-nums",
                line.tone === "included" && "font-medium text-brand-strong",
                line.tone === "minus" && "text-risk",
              )}
            >
              {line.amount}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-ink">
          <th scope="row" className="pe-3 pt-2.5 text-start font-semibold text-ink">
            {total.label}
          </th>
          <td className="pt-2.5 text-end text-xl font-semibold whitespace-nowrap text-ink tabular-nums">
            {total.amount}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
