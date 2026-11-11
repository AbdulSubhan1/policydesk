import { websitePaymentStartSchema } from "@/schemas/website";
import { getPaymentSummary, startPayment } from "@/server/payments/orders";
import { failureResponse, jsonError, parseBody, publicIdParam, readSigned } from "@/server/website/http";

// What the visitor is about to pay: the saved selection's lines and total, or already_paid.
export async function GET(req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const signed = await readSigned(req);
  if (!signed.ok) return signed.response;
  const publicId = await publicIdParam(params);
  if (!publicId) return jsonError(404, "not_found");

  const result = await getPaymentSummary(publicId);
  return result.ok ? Response.json({ payment: result.payment }) : failureResponse(result);
}

// Creates (or reuses) the PaySandbox checkout session and returns the URL to send the visitor to.
export async function POST(req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const signed = await readSigned(req);
  if (!signed.ok) return signed.response;
  const publicId = await publicIdParam(params);
  if (!publicId) return jsonError(404, "not_found");
  const parsed = parseBody(signed.body, websitePaymentStartSchema);
  if (!parsed.ok) return parsed.response;

  const result = await startPayment(publicId);
  return result.ok ? Response.json({ checkoutUrl: result.checkoutUrl }) : failureResponse(result);
}
