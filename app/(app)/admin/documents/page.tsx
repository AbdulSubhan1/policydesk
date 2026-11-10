import { eq } from "drizzle-orm";
import { Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { DEPARTMENTS, PRODUCT_INFO, PRODUCTS, type Product } from "@/lib/products";
import { can } from "@/lib/rbac";
import { saveProductDocuments, toggleDocumentType } from "./actions";
import { DocumentTypeForm } from "./forms";

const { documentTypes, productDocuments } = schema;

export default async function DocumentSettingsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireUser();
  if (!can(user, "documents:configure")) return <Forbidden permission="documents:configure" />;

  const { product: raw } = await searchParams;
  const product: Product = PRODUCTS.includes(raw as Product) ? (raw as Product) : "car";

  const [types, config] = await Promise.all([
    db.select().from(documentTypes).orderBy(documentTypes.id),
    db.select().from(productDocuments).where(eq(productDocuments.product, product)),
  ]);
  const setting = new Map(config.map((c) => [c.documentTypeId, c.required ? "required" : "optional"]));

  return (
    <>
      <PageHeader
        title="Document settings"
        description="One central list of document types. Choose which ones each product asks for; leads show only those in their upload dropdown."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card overflow-hidden lg:col-span-2">
          <h2 className="p-5 pb-3 text-sm font-semibold text-slate-900">Document types</h2>
          <ul className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
            {types.map((t) => (
              <li key={t.id} className={`flex items-center justify-between gap-3 px-5 py-2.5 ${t.active ? "" : "opacity-50"}`}>
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">{t.name}</span>
                  {t.description && <span className="block truncate text-xs text-slate-500">{t.description}</span>}
                </span>
                <form action={toggleDocumentType}>
                  <input type="hidden" name="documentTypeId" value={t.id} />
                  <button className="text-xs text-slate-500 hover:text-slate-900">{t.active ? "Disable" : "Enable"}</button>
                </form>
              </li>
            ))}
          </ul>
          <DocumentTypeForm />
        </section>

        <section className="lg:col-span-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {DEPARTMENTS.flatMap((d) => d.products).map((p) => (
              <a
                key={p}
                href={`/admin/documents?product=${p}`}
                className={`rounded-full px-3 py-1 text-sm ${p === product ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {PRODUCT_INFO[p].label}
              </a>
            ))}
          </div>

          <form key={product} action={saveProductDocuments} className="card overflow-hidden">
            <input type="hidden" name="product" value={product} />
            <div className="flex items-center justify-between p-5">
              <h2 className="text-sm font-semibold text-slate-900">{PRODUCT_INFO[product].label} insurance checklist</h2>
              <button className="btn-primary">Save</button>
            </div>
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2">Document</th>
                  <th className="px-2 py-2 text-center">Not used</th>
                  <th className="px-2 py-2 text-center">Optional</th>
                  <th className="px-2 py-2 text-center">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {types
                  .filter((t) => t.active)
                  .map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2.5 text-slate-900">{t.name}</td>
                      {(["none", "optional", "required"] as const).map((v) => (
                        <td key={v} className="px-2 py-2.5 text-center">
                          <input
                            type="radio"
                            name={`doc-${t.id}`}
                            value={v}
                            defaultChecked={(setting.get(t.id) ?? "none") === v}
                            className="h-4 w-4 accent-indigo-600"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </form>
        </section>
      </div>
    </>
  );
}
