import { payTokenSchema, websitePayLinkOpenSchema } from "@/schemas/website";
import { failureResponse, jsonError, parseBody, readSigned } from "@/server/website/http";
import { openPayLink } from "@/server/website/pay-links";

// The customer opened a coordinator's payment link on the website: which journey to start, or why not.
// A malformed token is just another token we don't have.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const signed = await readSigned(req);
  if (!signed.ok) return signed.response;
  const token = payTokenSchema.safeParse((await params).token);
  if (!token.success) return jsonError(404, "not_found");
  if (signed.body) {
    const parsed = parseBody(signed.body, websitePayLinkOpenSchema);
    if (!parsed.ok) return parsed.response;
  }

  const result = await openPayLink(token.data);
  return result.ok
    ? Response.json({ opportunity: { publicId: result.publicId }, status: result.status })
    : failureResponse(result);
}
