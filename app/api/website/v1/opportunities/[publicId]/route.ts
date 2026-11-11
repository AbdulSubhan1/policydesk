import { z } from "zod";
import { jsonError, readSigned } from "@/server/website/http";
import { getWebsiteOpportunity } from "@/server/website/opportunities";

export async function GET(req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const signed = await readSigned(req);
  if (!signed.ok) return signed.response;

  // A malformed id is just another id we don't have
  const publicId = z.uuid().safeParse((await params).publicId);
  const view = publicId.success ? await getWebsiteOpportunity(publicId.data) : null;
  return view ? Response.json(view) : jsonError(404, "not_found");
}
