import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { Product } from "./products";

const { documentTypes, productDocuments, documents } = schema;

/** Document types configured for a product, with whether each one is required. */
export async function documentsForProduct(product: Product) {
  return db
    .select({ id: documentTypes.id, name: documentTypes.name, description: documentTypes.description, required: productDocuments.required })
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
