import { eq, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { InsurerForm } from "@/components/forms/insurer-form";
import { PlanForm } from "@/components/forms/plan-form";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CellText,
  EmptyRow,
  Forbidden,
  Hidden,
  Input,
  InlineForm,
  ListRow,
  PageHeader,
  PillNav,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { PRODUCTS, type Product } from "@/constants/products";
import { cn } from "@/lib/cn";
import { money } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { toggleInsurer, updatePlan } from "@/server/actions/plans";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/server/db";

const { insurers, plans } = schema;

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireUser();
  if (!can(user, "plans:manage")) return <Forbidden permission="plans:manage" />;

  const requested = (await searchParams).product;
  const product: Product = PRODUCTS.find((p) => p === requested) ?? "car";

  const [insurerRows, planRows, t, locale] = await Promise.all([
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
    getTranslations(),
    getLocale(),
  ]);

  return (
    <>
      <PageHeader title={t("plans.title")} description={t("plans.description")} />

      <Card className="mb-6">
        <CardHeader title={t("plans.insurers")} />
        <ul>
          {insurerRows.map((i) => (
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
        <CardBody className="border-t border-line bg-paper/50">
          <InsurerForm />
        </CardBody>
      </Card>

      <PillNav
        label={t("plans.product")}
        items={PRODUCTS.map((p) => ({
          href: `/admin/plans?product=${p}`,
          label: t(`products.${p}`),
          active: p === product,
        }))}
      />

      <Card className="mb-6">
        <Table size="lg">
          <thead>
            <tr>
              <Th>{t("plans.plan", { product: t(`products.${product}`) })}</Th>
              <Th>{t("plans.cover")}</Th>
              <Th>{t("plans.excess")}</Th>
              <Th>{t("plans.basePremium")}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {planRows.length === 0 && <EmptyRow colSpan={5}>{t("plans.empty")}</EmptyRow>}
            {planRows.map(({ plan, insurerName, insurerActive }) => (
              <Tr key={plan.id} className={cn(!(plan.active && insurerActive) && "opacity-50")}>
                <Td>
                  <CellText
                    primary={localized(plan.name, locale)}
                    secondary={[insurerName, ...plan.benefits].join(", ")}
                  />
                </Td>
                <Td>{t(`covers.${plan.cover}`)}</Td>
                <Td>{money(plan.excess)}</Td>
                <Td>
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
                </Td>
                <Td className="text-end">
                  <form action={updatePlan}>
                    <Hidden name="planId" value={plan.id} />
                    <Button size="sm" name="intent" value="toggle" variant={plan.active ? "danger" : "secondary"}>
                      {plan.active ? t("common.deactivate") : t("common.activate")}
                    </Button>
                  </form>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title={t("plans.addPlan")} description={t("plans.addPlanHint")} />
        <CardBody>
          <PlanForm key={product} product={product} insurers={insurerRows.filter((i) => i.active)} />
        </CardBody>
      </Card>
    </>
  );
}
