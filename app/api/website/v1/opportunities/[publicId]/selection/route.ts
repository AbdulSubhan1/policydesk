import { websiteSelectionSchema } from "@/schemas/website";
import { failureResponse, jsonError, parseBody, publicIdParam, readSigned } from "@/server/website/http";
import { saveWebsiteSelection } from "@/server/website/plans";

// The visitor's plan and ticked add-ons. PolicyDesk prices them; picking again updates the same quote.
export async function PUT(req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const signed = await readSigned(req);
  if (!signed.ok) return signed.response;
  const publicId = await publicIdParam(params);
  if (!publicId) return jsonError(404, "not_found");
  const parsed = parseBody(signed.body, websiteSelectionSchema);
  if (!parsed.ok) return parsed.response;

  const result = await saveWebsiteSelection(publicId, parsed.data);
  return result.ok ? Response.json({ selection: result.selection }) : failureResponse(result);
}
