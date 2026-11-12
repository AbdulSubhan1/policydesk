import { z } from "zod";
import { type LimitGroup, clientIp, consume } from "./rate-limit";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyRequest } from "./signature";

// Shared plumbing for the signed website routes: every error has the same shape, { error: { code, message?, field? } }

/** Bodies are a few hundred bytes; anything far bigger is not from our website. */
const MAX_BODY_BYTES = 16 * 1024;

export function jsonError(status: number, code: string, extra?: { message?: string; field?: string }) {
  return Response.json({ error: { code, ...extra } }, { status });
}

/** The error response for a refused server/website result. */
export function failureResponse(f: { status: number; code: string; field?: string; message?: string }) {
  return jsonError(f.status, f.code, f.field ? { field: f.field, message: f.message } : undefined);
}

/** The route's public id, or null when it is not a UUID: a malformed id is just another id we don't have. */
export async function publicIdParam(params: Promise<{ publicId: string }>) {
  const parsed = z.uuid().safeParse((await params).publicId);
  return parsed.success ? parsed.data : null;
}

/** Reads the raw body and checks the signature. Off (503) until WEBSITE_API_SECRET is set. */
export async function readSigned(
  req: Request,
): Promise<{ ok: true; body: string } | { ok: false; response: Response }> {
  const secret = process.env.WEBSITE_API_SECRET;
  if (!secret) return { ok: false, response: jsonError(503, "api_disabled") };

  const body = await req.text();
  const url = new URL(req.url);
  const valid = verifyRequest(
    {
      method: req.method,
      pathAndQuery: url.pathname + url.search,
      body,
      timestamp: req.headers.get(TIMESTAMP_HEADER),
      signature: req.headers.get(SIGNATURE_HEADER),
    },
    secret,
    Math.floor(Date.now() / 1000),
  );
  if (!valid) return { ok: false, response: jsonError(401, "unauthorized") };
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return { ok: false, response: jsonError(400, "invalid_request", { message: "validation.tooLong" }) };
  }
  return { ok: true, body };
}

/** Counts the call against the visitor IP's limit; a 429 with Retry-After once it is used up. Call after readSigned. */
export async function limited(req: Request, group: LimitGroup): Promise<Response | null> {
  const result = await consume(group, clientIp(req));
  if (result.ok) return null;
  return Response.json(
    { error: { code: "rate_limited" } },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}

/** Parses a JSON body with a Zod schema; the first problem becomes a 400 naming the field. */
export function parseBody<T extends z.ZodType>(
  body: string,
  schema: T,
): { ok: true; data: z.output<T> } | { ok: false; response: Response } {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, response: jsonError(400, "invalid_request", { message: "Body is not valid JSON" }) };
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return { ok: true, data: parsed.data };

  const issue = parsed.error.issues[0];
  // An extra key is reported on its parent; name the key itself so the caller knows what to drop
  const path = issue.code === "unrecognized_keys" ? [...issue.path, issue.keys[0]] : issue.path;
  return {
    ok: false,
    response: jsonError(400, "invalid_request", { field: path.join("."), message: issue.message }),
  };
}
