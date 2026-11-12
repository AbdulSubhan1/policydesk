import { getLocale, getTranslations } from "next-intl/server";
import { DemoLockedNotice } from "@/components/demo-locked-notice";
import { InsurerForm } from "@/components/forms/insurer-form";
import { PlanEditForm } from "@/components/forms/plan-edit-form";
import { PlanForm } from "@/components/forms/plan-form";
import { PlanFilters } from "@/components/plans/plan-filters";
import {
  Badge,
  Button,
  ButtonLink,
  CellText,
  DataTable,
  DropdownMenu,
  Forbidden,
  Hidden,
  Icon,
  PageHeader,
  Panel,
} from "@/components/ui";
import { WEBSITE_ADD_ONS } from "@/constants/add-ons";
import { PRODUCTS, type Product } from "@/constants/products";
import { isWebsiteProduct } from "@/constants/website";
import { money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { addOnKinds } from "@/lib/plans";
import { can } from "@/lib/rbac";
import { withParams } from "@/lib/url";
import { toggleInsurer, togglePlan } from "@/server/actions/plans";
import { requireUser } from "@/server/auth";
import { isDemoLocked } from "@/server/demo-lock";
import { countPlansByProduct, listInsurers, listPlans } from "@/server/queries/plans";

type Query = { product?: string; insurer?: string; inactive?: string; edit?: string };

export default async function PlansPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser();
  if (!can(user, "plans:manage")) return <Forbidden permission="plans:manage" />;

  const query = await searchParams;
  const product: Product = PRODUCTS.find((p) => p === query.product) ?? "car";
  const withInactive = query.inactive === "1";
  const insurerId = Number(query.insurer) || undefined;
  const [insurers, plans, counts, t, locale, locked] = await Promise.all([
    listInsurers(),
    listPlans(product, { insurerId, withInactive }),
    countPlansByProduct(withInactive),
    getTranslations(),
    getLocale(),
    isDemoLocked(),
  ]);
  const params = { product, insurer: query.insurer, inactive: query.inactive };
  // The live demo shows the catalogue read-only: no edit panel, no add forms, no activate/deactivate
  const editing = locked ? undefined : plans.find((p) => p.plan.id === Number(query.edit));
  const editHref = (planId?: number) =>
    `${withParams("/admin/plans", params, { edit: planId ? String(planId) : undefined })}${planId ? "#edit-plan" : ""}`;

  const addOnSummary = (addOns: (typeof plans)[number]["addOns"]) => {
    const kinds = addOnKinds(addOns);
    const parts = (["included", "optional", "preselected"] as const)
      .filter((k) => kinds[k] > 0)
      .map((k) => t(`plans.addOnSummary.${k}`, { count: kinds[k] }));
    return parts.length ? parts.join(" · ") : t("plans.addOnSummary.none");
  };

  return (
    <>
      <PageHeader
        title={t("plans.title")}
        description={t("plans.description")}
        action={
          !locked && (
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="#add-insurer">{t("plans.addInsurer")}</ButtonLink>
              <ButtonLink href="#add-plan" variant="primary">
                {t("plans.addPlan")}
              </ButtonLink>
            </div>
          )
        }
      />
      {locked && <DemoLockedNotice className="mb-6" />}

      <ul aria-label={t("plans.insurers")} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {insurers.map((i) => (
          <li key={i.id} className="min-w-0">
            <Panel>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CellText
                    primary={i.name}
                    secondary={
                      i.plans.length
                        ? i.plans
                            .map((p) =>
                              t("plans.insurerPlans", { count: p.count, product: t(`products.${p.product}`) }),
                            )
                            .join(" · ")
                        : t("plans.noActivePlans")
                    }
                  />
                  {!i.active && (
                    <span className="mt-1.5 inline-flex">
                      <Badge tone="grey">{t("common.inactive")}</Badge>
                    </span>
                  )}
                </div>
                {!locked && (
                  <>
                    <form id={`insurer-${i.id}`} action={toggleInsurer}>
                      <Hidden name="insurerId" value={i.id} />
                    </form>
                    <DropdownMenu
                      label={i.name}
                      align="end"
                      items={[
                        {
                          label: i.active ? t("common.deactivate") : t("common.activate"),
                          danger: i.active,
                          form: `insurer-${i.id}`,
                        },
                      ]}
                      trigger={
                        <Button type="button" variant="ghost" size="sm" aria-label={i.name}>
                          <Icon name="more" size={16} />
                        </Button>
                      }
                    />
                  </>
                )}
              </div>
            </Panel>
          </li>
        ))}
      </ul>

      <div className="mb-3">
        <PlanFilters
          params={params}
          products={PRODUCTS.map((p) => ({
            value: p,
            label: t("plans.productCount", { product: t(`products.${p}`), count: counts.get(p) ?? 0 }),
          }))}
          insurers={insurers.map((i) => ({ value: String(i.id), label: i.name }))}
        />
      </div>

      <div className="mb-6">
        <DataTable
          path="/admin/plans"
          params={params}
          rows={plans}
          rowKey={(r) => r.plan.id}
          minWidth="lg"
          empty={{ title: t("plans.empty"), description: t("plans.addPlanHint"), icon: "package" }}
          columns={[
            {
              key: "plan",
              header: t("plans.planHeader"),
              cell: ({ plan, insurerName }) => (
                <CellText primary={localized(plan.name, locale)} secondary={insurerName} />
              ),
            },
            { key: "cover", header: t("plans.cover"), cell: ({ plan }) => t(`covers.${plan.cover}`) },
            {
              key: "excess",
              header: t("plans.excess"),
              align: "end",
              nowrap: true,
              cell: ({ plan }) => money(plan.excess),
            },
            {
              key: "price",
              header: t("plans.priceYear"),
              align: "end",
              nowrap: true,
              cell: ({ plan }) => <span className="font-semibold text-ink">{money(plan.basePremium)}</span>,
            },
            { key: "addOns", header: t("plans.addOns"), cell: ({ addOns }) => addOnSummary(addOns) },
            {
              key: "edit",
              header: <span className="sr-only">{t("plans.edit")}</span>,
              align: "end",
              nowrap: true,
              cell: ({ plan, insurerActive }) => (
                <span className="inline-flex items-center gap-2">
                  {!(plan.active && insurerActive) && <Badge tone="grey">{t("common.inactive")}</Badge>}
                  {locked ? null : editing?.plan.id === plan.id ? (
                    <Badge tone="plum">{t("plans.editing")}</Badge>
                  ) : (
                    <ButtonLink
                      href={editHref(plan.id)}
                      size="sm"
                      scroll={false}
                      aria-label={t("plans.editPlan", { plan: localized(plan.name, locale) })}
                    >
                      {t("plans.edit")}
                    </ButtonLink>
                  )}
                </span>
              ),
            },
          ]}
        />
      </div>

      {editing && (
        <Panel
          id="edit-plan"
          title={t("plans.editTitle", { plan: localized(editing.plan.name, locale) })}
          description={
            <>
              {t("plans.editDescription", { insurer: editing.insurerName, cover: t(`covers.${editing.plan.cover}`) })}
              {!editing.insurerActive && ` ${t("plans.inactiveInsurer")}`}
            </>
          }
          className="mb-6 scroll-mt-6"
        >
          <form id="plan-toggle" action={togglePlan}>
            <Hidden name="planId" value={editing.plan.id} />
          </form>
          <PlanEditForm
            key={editing.plan.id}
            plan={editing.plan}
            addOns={editing.addOns}
            catalogue={isWebsiteProduct(product) ? [...WEBSITE_ADD_ONS[product]] : []}
            toggleForm="plan-toggle"
            active={editing.plan.active}
            cancelHref={editHref()}
          />
        </Panel>
      )}

      {!locked && (
        <>
          <Panel
            id="add-plan"
            title={t("plans.addPlan")}
            description={t("plans.addPlanHint")}
            className="mb-6 scroll-mt-6"
          >
            <PlanForm key={product} product={product} insurers={insurers.filter((i) => i.active)} />
          </Panel>
          <Panel id="add-insurer" title={t("plans.addInsurer")} className="scroll-mt-6">
            <InsurerForm />
          </Panel>
        </>
      )}
    </>
  );
}
