"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { PRODUCTS, type Product } from "@/lib/products";

const { documentTypes, productDocuments } = schema;

export type FormState = { error?: string; ok?: boolean };

export async function createDocumentType(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("documents:configure");
  const parsed = z
    .object({ name: z.string().trim().min(2, "Name is too short").max(60), description: z.string().trim().max(200).default("") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [existing] = await db.select({ id: documentTypes.id }).from(documentTypes).where(eq(documentTypes.name, parsed.data.name));
  if (existing) return { error: "This document type already exists" };

  const [doc] = await db.insert(documentTypes).values(parsed.data).returning();
  await logAudit({ userId: user.id, action: "create", entity: "document_type", entityId: doc.id, details: doc.name });
  revalidatePath("/admin/documents");
  return { ok: true };
}

export async function toggleDocumentType(formData: FormData) {
  const user = await requirePermission("documents:configure");
  const [doc] = await db.select().from(documentTypes).where(eq(documentTypes.id, Number(formData.get("documentTypeId"))));
  if (!doc) throw new Error("Not found");

  await db.update(documentTypes).set({ active: !doc.active }).where(eq(documentTypes.id, doc.id));
  await logAudit({ userId: user.id, action: doc.active ? "deactivate" : "activate", entity: "document_type", entityId: doc.id, details: doc.name });
  revalidatePath("/admin/documents");
}

/** Saves the full document checklist of one product. Each row is "not used", "optional" or "required". */
export async function saveProductDocuments(formData: FormData) {
  const user = await requirePermission("documents:configure");
  const product = z.enum(PRODUCTS as [Product, ...Product[]]).parse(formData.get("product"));
  const allTypes = await db.select({ id: documentTypes.id }).from(documentTypes);

  const rows = allTypes.flatMap(({ id }) => {
    const value = formData.get(`doc-${id}`);
    return value === "optional" || value === "required" ? [{ product, documentTypeId: id, required: value === "required" }] : [];
  });

  await db.delete(productDocuments).where(eq(productDocuments.product, product));
  if (rows.length) await db.insert(productDocuments).values(rows);
  await logAudit({
    userId: user.id,
    action: "configure",
    entity: "product_documents",
    details: `${product}: ${rows.filter((r) => r.required).length} required, ${rows.filter((r) => !r.required).length} optional`,
  });
  revalidatePath("/admin/documents");
}
