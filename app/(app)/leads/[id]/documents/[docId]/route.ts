import { and, eq } from "drizzle-orm";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { getLead } from "@/server/queries/leads";

// The one route handler in the app: streaming a stored file to the browser is a GET, not a server action.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const user = await getCurrentUser();
  if (!user || !can(user, "documents:download")) return new Response("Forbidden", { status: 403 });
  // Same row-level scope as the lead page: no access to the lead means no access to its files
  if (!(await getLead(user, Number(id)))) return new Response("Not found", { status: 404 });

  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.id, Number(docId)), eq(schema.documents.leadId, Number(id))));
  if (!doc) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(doc.data, "base64"), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
