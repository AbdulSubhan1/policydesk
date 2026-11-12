import { getWebsiteOrder } from "@/server/payments/orders";
import { failureResponse, jsonError, limited, publicIdParam, readSigned } from "@/server/website/http";

// The thank-you page: the order (re-checked at PaySandbox while pending) and the advisor.
export async function GET(req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const signed = await readSigned(req);
  if (!signed.ok) return signed.response;
  const limit = await limited(req, "read");
  if (limit) return limit;
  const publicId = await publicIdParam(params);
  if (!publicId) return jsonError(404, "not_found");

  const result = await getWebsiteOrder(publicId);
  return result.ok ? Response.json(result.view) : failureResponse(result);
}
