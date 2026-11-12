import { desc, eq } from "drizzle-orm";
import type { Product } from "@/constants/products";
import { db, schema } from "@/server/db";
import { paidOrderOf, payLinkState } from "@/server/website/pay-links";
import { getWebsiteSelection, loadSellablePlans } from "@/server/website/plans";

const { paymentLinks, users } = schema;

/** What the Online payment panel shows for a converted website opportunity: plans, the saved choice and the links. */
export async function getOnlinePayment(leadId: number, product: Product) {
  const [plans, selection, links, paid] = await Promise.all([
    loadSellablePlans(product),
    getWebsiteSelection(leadId),
    db
      .select({ link: paymentLinks, creatorName: users.name })
      .from(paymentLinks)
      .leftJoin(users, eq(paymentLinks.createdBy, users.id))
      .where(eq(paymentLinks.leadId, leadId))
      .orderBy(desc(paymentLinks.id)),
    paidOrderOf(leadId),
  ]);
  const now = new Date();
  return {
    plans,
    selection,
    paid: !!paid,
    links: links.map(({ link, creatorName }) => ({
      id: link.id,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      openedAt: link.openedAt,
      creatorName,
      state: payLinkState(link, paid, now),
    })),
  };
}
