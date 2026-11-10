"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PRODUCTS } from "@/constants/products";
import { id, option, type ActionResult } from "@/schemas/common";
import { documentTypeSchema, type DocumentTypeInput } from "@/schemas/document-type";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { db, schema } from "@/server/db";

const { documentTypes, productDocuments } = schema;

export async function createDocumentType(input: DocumentTypeInput): Promise<ActionResult> {
  const user = await requirePermission("documents:configure");
  const parsed = documentTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { nameEn, nameAr, descriptionEn, descriptionAr } = parsed.data;

  const [existing] = await db
    .select({ id: documentTypes.id })
    .from(documentTypes)
    .where(sql`lower(${documentTypes.name}->>'en') = lower(${nameEn})`);
  if (existing) return { ok: false, error: "errors.duplicateName" };

  const [doc] = await db
    .insert(documentTypes)
    .values({
      name: nameAr ? { en: nameEn, ar: nameAr } : { en: nameEn },
      description: descriptionAr ? { en: descriptionEn, ar: descriptionAr } : { en: descriptionEn },
    })
    .returning();
  await logAudit({ userId: user.id, action: "create", entity: "document_type", entityId: doc.id, details: nameEn });
  revalidatePath("/admin/documents");
  return { ok: true };
}

export async function toggleDocumentType(formData: FormData) {
  const user = await requirePermission("documents:configure");
  const [doc] = await db
    .select()
    .from(documentTypes)
    .where(eq(documentTypes.id, id.parse(formData.get("documentTypeId"))));
  if (!doc) throw new Error("errors.notFound");

  await db.update(documentTypes).set({ active: !doc.active }).where(eq(documentTypes.id, doc.id));
  await logAudit({
    userId: user.id,
    action: doc.active ? "deactivate" : "activate",
    entity: "document_type",
    entityId: doc.id,
    details: doc.name.en,
  });
  revalidatePath("/admin/documents");
}

/** Saves one product's checklist. Each document type is "none", "optional" or "required". */
export async function saveProductDocuments(formData: FormData) {
  const user = await requirePermission("documents:configure");
  const product = option(PRODUCTS).parse(formData.get("product"));
  const types = await db.select({ id: documentTypes.id }).from(documentTypes);

  const rows = types.flatMap(({ id: typeId }) => {
    const value = formData.get(`doc-${typeId}`);
    return value === "optional" || value === "required"
      ? [{ product, documentTypeId: typeId, required: value === "required" }]
      : [];
  });

  await db.delete(productDocuments).where(eq(productDocuments.product, product));
  if (rows.length) await db.insert(productDocuments).values(rows);
  await logAudit({
    userId: user.id,
    action: "configure",
    entity: "product_documents",
    details: `${product}: ${rows.filter((r) => r.required).length}/${rows.length}`,
  });
  revalidatePath("/admin/documents");
}
