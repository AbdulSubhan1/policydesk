import { getLocale, getTranslations } from "next-intl/server";
import { InsurerForm } from "@/components/forms/insurer-form";
import { PlanForm } from "@/components/forms/plan-form";
import {
  Badge,
  Button,
  CellText,
  DataTable,
  Forbidden,
  Hidden,
  InlineForm,
  Input,
  ListRow,
  PageHeader,
  Panel,
  PillNav,
} from "@/components/ui";
import { PRODUCTS, type Product } from "@/constants/products";
import { money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { toggleInsurer, updatePlan } from "@/server/actions/plans";
import { requireUser } from "@/server/auth";
import { listInsurers, listPlans } from "@/server/queries/plans";

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireUser();
  if (!can(user, "plans:manage")) return <Forbidden permission="plans:manage" />;

  const requested = (await searchParams).product;
  const product: Product = PRODUCTS.find((p) => p === requested) ?? "car";
  const [insurers, plans, t, locale] = await Promise.all([
    listInsurers(),
    listPlans(product),
    getTranslations(),
    getLocale(),
  ]);

  return (
    <>
      <PageHeader title={t("plans.title")} description={t("plans.description")} />

      <Panel title={t("plans.insurers")} flush footer={<InsurerForm />} className="mb-6">
        <ul>
          {insurers.map((i) => (
            <ListRow
              key={i.id}
              muted={!i.active}
              action={
                <form action={toggleInsurer}>
                  <Hidden name="insurerId" value={i.id} />
                  <Button size="sm" variant={i.active ? "danger" : "secondary"}>
                    {i.active ? t("common.deactivate") : t("common.activate")}
                  </Button>
                </form>
              }
            >
              <CellText
                primary={i.name}
                secondary={[t("plans.planCount", { count: i.planCount }), i.contactEmail].filter(Boolean).join(", ")}
              />
            </ListRow>
          ))}
        </ul>
      </Panel>

      <PillNav
        label={t("plans.product")}
        items={PRODUCTS.map((p) => ({
          href: `/admin/plans?product=${p}`,
          label: t(`products.${p}`),
          active: p === product,
        }))}
      />
      <div className="mb-6">
        <DataTable
          path="/admin/plans"
          rows={plans}
          rowKey={(r) => r.plan.id}
          minWidth="lg"
          empty={{ title: t("plans.empty"), description: t("plans.addPlanHint"), icon: "package" }}
          columns={[
            {
              key: "plan",
              header: t("plans.plan", { product: t(`products.${product}`) }),
              cell: ({ plan, insurerName }) => (
                <CellText
                  primary={localized(plan.name, locale)}
                  secondary={[insurerName, ...plan.benefits].join(", ")}
                />
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
              key: "premium",
              header: t("plans.basePremium"),
              cell: ({ plan }) => (
                <InlineForm key={plan.basePremium} action={updatePlan} className="flex-nowrap">
                  <Hidden name="planId" value={plan.id} />
                  <Input
                    name="basePremium"
                    type="number"
                    min={1}
                    defaultValue={plan.basePremium}
                    aria-label={t("plans.basePremium")}
                    className="w-28"
                  />
                  <Button size="sm" name="intent" value="price">
                    {t("common.save")}
                  </Button>
                </InlineForm>
              ),
            },
            {
              key: "state",
              header: "",
              align: "end",
              cell: ({ plan, insurerActive }) => (
                <span className="inline-flex items-center gap-2">
                  {!(plan.active && insurerActive) && <Badge tone="grey">{t("common.inactive")}</Badge>}
                  <form action={updatePlan}>
                    <Hidden name="planId" value={plan.id} />
                    <Button size="sm" name="intent" value="toggle" variant={plan.active ? "danger" : "secondary"}>
                      {plan.active ? t("common.deactivate") : t("common.activate")}
                    </Button>
                  </form>
                </span>
              ),
            },
          ]}
        />
      </div>

      <Panel title={t("plans.addPlan")} description={t("plans.addPlanHint")}>
        <PlanForm key={product} product={product} insurers={insurers.filter((i) => i.active)} />
      </Panel>
    </>
  );
}
