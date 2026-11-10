import { eq, sql } from "drizzle-orm";
import { EmptyRow, Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { money } from "@/lib/format";
import { DEPARTMENTS, PRODUCT_INFO, PRODUCTS, type Product } from "@/lib/products";
import { can } from "@/lib/rbac";
import { toggleInsurer, updatePlan } from "./actions";
import { InsurerForm, PlanForm } from "./forms";

const { insurers, plans } = schema;

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireUser();
  if (!can(user, "plans:manage")) return <Forbidden permission="plans:manage" />;

  const { product: raw } = await searchParams;
  const product: Product = PRODUCTS.includes(raw as Product) ? (raw as Product) : "car";

  const [insurerRows, planRows] = await Promise.all([
    db
      .select({
        id: insurers.id,
        name: insurers.name,
        contactEmail: insurers.contactEmail,
        active: insurers.active,
        planCount: sql<number>`(select count(*)::int from ${plans} where ${plans.insurerId} = ${insurers.id})`,
      })
      .from(insurers)
      .orderBy(insurers.name),
    db
      .select({ plan: plans, insurerName: insurers.name, insurerActive: insurers.active })
      .from(plans)
      .innerJoin(insurers, eq(plans.insurerId, insurers.id))
      .where(eq(plans.product, product))
      .orderBy(insurers.name, plans.basePremium),
  ]);

  return (
    <>
      <PageHeader title="Insurers & plans" description="Plans loaded from each insurer. Advisors quote from active plans of the lead's product." />

      <section className="card mb-6 overflow-hidden">
        <h2 className="p-5 pb-3 text-sm font-semibold text-slate-900">Insurers</h2>
        <ul className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
          {insurerRows.map((i) => (
            <li key={i.id} className={`flex items-center justify-between gap-3 px-5 py-3 ${i.active ? "" : "opacity-60"}`}>
              <span>
                <span className="font-medium text-slate-900">{i.name}</span>
                <span className="block text-xs text-slate-500">
                  {i.planCount} plans{i.contactEmail && ` · ${i.contactEmail}`}
                </span>
              </span>
              <form action={toggleInsurer}>
                <input type="hidden" name="insurerId" value={i.id} />
                <button className={i.active ? "btn-danger" : "btn-secondary"}>{i.active ? "Deactivate" : "Activate"}</button>
              </form>
            </li>
          ))}
        </ul>
        <InsurerForm />
      </section>

      <div className="mb-4 flex flex-wrap gap-2">
        {DEPARTMENTS.flatMap((d) => d.products).map((p) => (
          <a
            key={p}
            href={`/admin/plans?product=${p}`}
            className={`rounded-full px-3 py-1 text-sm ${p === product ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {PRODUCT_INFO[p].label}
          </a>
        ))}
      </div>

      <section className="card mb-6 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">{PRODUCT_INFO[product].label} plan</th>
              <th className="px-4 py-3">Cover</th>
              <th className="px-4 py-3">Excess</th>
              <th className="px-4 py-3">Base premium</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {planRows.length === 0 && <EmptyRow colSpan={5}>No plans for this product yet.</EmptyRow>}
            {planRows.map(({ plan, insurerName, insurerActive }) => (
              <tr key={plan.id} className={plan.active && insurerActive ? "" : "opacity-50"}>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{plan.name}</span>
                  <span className="block text-xs text-slate-500">
                    {insurerName}
                    {plan.benefits.length > 0 && ` · ${plan.benefits.join(", ")}`}
                  </span>
                </td>
                <td className="px-4 py-3">{plan.cover}</td>
                <td className="px-4 py-3">{money(plan.excess)}</td>
                <td className="px-4 py-3">
                  <form key={plan.basePremium} action={updatePlan} className="flex gap-2">
                    <input type="hidden" name="planId" value={plan.id} />
                    <input name="basePremium" type="number" min={1} defaultValue={plan.basePremium} className="input !w-28 !py-1.5" />
                    <button name="intent" value="price" className="btn-secondary">
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={updatePlan}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <button name="intent" value="toggle" className={plan.active ? "btn-danger" : "btn-secondary"}>
                      {plan.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <PlanForm insurers={insurerRows.filter((i) => i.active)} defaultProduct={product} />
    </>
  );
}
