import { websiteOpportunitySchema } from "@/schemas/website";
import { limited, parseBody, readSigned } from "@/server/website/http";
import { createWebsiteOpportunity } from "@/server/website/opportunities";

// Signed by the public website, not a session (AGENTS.md exception). Logic lives in server/website/.
export async function POST(req: Request) {
  const signed = await readSigned(req);
  if (!signed.ok) return signed.response;
  const limit = await limited(req, "lead");
  if (limit) return limit;
  const parsed = parseBody(signed.body, websiteOpportunitySchema);
  if (!parsed.ok) return parsed.response;

  return Response.json(await createWebsiteOpportunity(parsed.data), { status: 201 });
}
