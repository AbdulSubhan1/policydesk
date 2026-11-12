import { jsonError, limited, publicIdParam, readSigned } from "@/server/website/http";
import { getWebsiteOpportunity } from "@/server/website/opportunities";

export async function GET(req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const signed = await readSigned(req);
  if (!signed.ok) return signed.response;
  const limit = await limited(req, "read");
  if (limit) return limit;

  const publicId = await publicIdParam(params);
  const view = publicId ? await getWebsiteOpportunity(publicId) : null;
  return view ? Response.json(view) : jsonError(404, "not_found");
}
