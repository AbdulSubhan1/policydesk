import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getLead } from "@/lib/queries";
import { can } from "@/lib/rbac";

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
