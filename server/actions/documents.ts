"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES } from "@/constants/config";
import type { ActionResult } from "@/schemas/action-result";
import { id } from "@/schemas/fields";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { requireLead } from "@/server/guards";
import { assertNotDemoLocked, demoLockError } from "@/server/demo-lock";

const { documents, productDocuments } = schema;

// Files cannot be sent as a plain object, so this action takes FormData (built by the upload form)
export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  const { user, lead, opportunity } = await requireLead("documents:upload", id.parse(formData.get("leadId")));
  // Files are stored in the database, so the live demo takes none
  const locked = await demoLockError("uploads", user.email, `/leads/${lead.id}`);
  if (locked) return { ok: false, error: locked };
  const documentTypeId = id.parse(formData.get("documentTypeId"));
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "errors.fileMissing" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "errors.fileTooLarge" };
  if (!UPLOAD_MIME_TYPES.includes(file.type)) return { ok: false, error: "errors.fileType" };

  // Only document types set up for this product under Document settings are accepted
  const [allowed] = await db
    .select()
    .from(productDocuments)
    .where(and(eq(productDocuments.product, opportunity.product), eq(productDocuments.documentTypeId, documentTypeId)));
  if (!allowed) return { ok: false, error: "errors.documentNotUsed" };

  const [doc] = await db
    .insert(documents)
    .values({
      leadId: lead.id,
      documentTypeId,
      fileName: file.name.slice(0, 120),
      mimeType: file.type,
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()).toString("base64"),
      uploadedBy: user.id,
    })
    .returning({ id: documents.id, fileName: documents.fileName });
  await logAudit({
    userId: user.id,
    action: "upload",
    entity: "document",
    entityId: doc.id,
    leadId: lead.id,
    details: doc.fileName,
  });
  revalidatePath("/leads/[id]", "page");
  return { ok: true };
}

export async function deleteDocument(formData: FormData) {
  const [doc] = await db
    .select({ id: documents.id, leadId: documents.leadId, fileName: documents.fileName })
    .from(documents)
    .where(eq(documents.id, id.parse(formData.get("documentId"))));
  if (!doc) throw new Error("errors.notFound");
  const { user } = await requireLead("documents:upload", doc.leadId);
  await assertNotDemoLocked("document_delete", user.email, `/leads/${doc.leadId}`);

  await db.delete(documents).where(eq(documents.id, doc.id));
  await logAudit({
    userId: user.id,
    action: "delete",
    entity: "document",
    entityId: doc.id,
    leadId: doc.leadId,
    details: doc.fileName,
  });
  revalidatePath("/leads/[id]", "page");
}
