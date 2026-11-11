import { failureResponse, jsonError, publicIdParam, readSigned } from "@/server/website/http";
import { getWebsitePlans } from "@/server/website/plans";

// Plan cards for a full-form lead, cheapest first. A short-form opportunity has no lead yet → 409 no_lead.
export async function GET(req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const signed = await readSigned(req);
  if (!signed.ok) return signed.response;
  const publicId = await publicIdParam(params);
  if (!publicId) return jsonError(404, "not_found");

  const result = await getWebsitePlans(publicId);
  return result.ok ? Response.json({ plans: result.plans }) : failureResponse(result);
}
