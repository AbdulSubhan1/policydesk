"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/schemas/action-result";
import { id } from "@/schemas/fields";
import {
  fullDetailsSchemaFor,
  websiteConvertSchema,
  websiteDetailsSchemaFor,
  type WebsiteDetailsInput,
} from "@/schemas/website";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { requireOpportunity } from "@/server/guards";
import { convertWebsiteOpportunityToLead, isWebsiteOpportunity } from "@/server/website/opportunities";

// The coordinator's side of a quick-form website opportunity: complete the details, then convert without an advisor.

const { opportunities } = schema;

/** A website opportunity in the user's scope that is still open. The UI offers nothing else, so anything else throws. */
async function openWebsiteOpportunity(id: number) {
  const { user, opportunity } = await requireOpportunity("opportunities:convert", id);
  if (!isWebsiteOpportunity(opportunity) || opportunity.status === "converted") {
    throw new Error("Only open website opportunities are handled here");
  }
  return { user, opp: opportunity };
}

export async function saveWebsiteDetails(input: WebsiteDetailsInput): Promise<ActionResult> {
  // The fields depend on the opportunity's product, so it is loaded (and access checked) before the answers
  const { user, opp } = await openWebsiteOpportunity(id.parse(input.id));
  const parsed = websiteDetailsSchemaFor(opp.product).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  // Other keys stay; an answer cleared in the form is removed, as if the website never sent it
  const details = Object.fromEntries(
    Object.entries({ ...opp.details, ...parsed.data }).filter(([key, value]) => key !== "id" && value !== undefined),
  ) as typeof opp.details;
  const changed = Object.keys({ ...opp.details, ...details }).filter((key) => opp.details[key] !== details[key]);

  await db.update(opportunities).set({ details, updatedAt: new Date() }).where(eq(opportunities.id, opp.id));
  await logAudit({
    userId: user.id,
    action: "details",
    entity: "opportunity",
    entityId: opp.id,
    details: changed.join(", ") || "—",
  });
  revalidatePath(`/opportunities/${opp.id}`);
  return { ok: true };
}

/** Converts once the details are as complete as the full form's. The advisor is assigned after payment. */
export async function convertWebsiteOpportunity(input: { id: number }): Promise<ActionResult> {
  const parsed = websiteConvertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { user, opp } = await openWebsiteOpportunity(parsed.data.id);
  if (opp.status !== "qualified") throw new Error("Only qualified opportunities can be converted");

  // Names the first field to complete, in the form's order; a rule across fields (trip dates…) gives its own message
  const details = fullDetailsSchemaFor(opp.product).safeParse(opp.details);
  if (!details.success) {
    const [issue] = details.error.issues;
    const missing = issue.path.length > 0 && issue.code !== "custom";
    const required = issue.code === "custom" && issue.message === "validation.required";
    return {
      ok: false,
      error: missing || required ? `errors.detailsMissing.${String(issue.path[0])}` : issue.message,
    };
  }

  await convertWebsiteOpportunityToLead(opp, user.id, "advisor after payment");
  revalidatePath(`/opportunities/${opp.id}`);
  return { ok: true };
}
