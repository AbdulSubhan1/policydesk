import { and, eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import type { Product } from "@/constants/products";

const { documentTypes, productDocuments, documents } = schema;

/** Document types configured for a product, with whether each one is required. */
export async function documentsForProduct(product: Product) {
  return db
    .select({
      id: documentTypes.id,
      name: documentTypes.name,
      description: documentTypes.description,
      required: productDocuments.required,
    })
    .from(productDocuments)
    .innerJoin(documentTypes, eq(productDocuments.documentTypeId, documentTypes.id))
    .where(and(eq(productDocuments.product, product), eq(documentTypes.active, true)))
    .orderBy(documentTypes.id);
}

export async function missingRequiredDocuments(leadId: number, product: Product) {
  const [config, uploaded] = await Promise.all([
    documentsForProduct(product),
    db.select({ documentTypeId: documents.documentTypeId }).from(documents).where(eq(documents.leadId, leadId)),
  ]);
  const have = new Set(uploaded.map((d) => d.documentTypeId));
  return config.filter((d) => d.required && !have.has(d.id));
}

/** The central list of document types, enabled or not. */
export function listDocumentTypes() {
  return db.select().from(documentTypes).orderBy(documentTypes.id);
}

/** How each document type is used by a product: "none", "optional" or "required". */
export async function productChecklist(product: Product) {
  const rows = await db.select().from(productDocuments).where(eq(productDocuments.product, product));
  return new Map(rows.map((r) => [r.documentTypeId, r.required ? "required" : "optional"] as const));
}
