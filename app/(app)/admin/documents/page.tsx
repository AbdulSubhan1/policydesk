import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { DocumentTypeForm } from "@/components/forms/document-type-form";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CellText,
  Forbidden,
  Hidden,
  ListRow,
  PageHeader,
  PillNav,
  Radio,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { PRODUCTS, type Product } from "@/constants/products";
import { localized } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { saveProductDocuments, toggleDocumentType } from "@/server/actions/document-settings";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/server/db";

const { documentTypes, productDocuments } = schema;
const LEVELS = ["none", "optional", "required"] as const;

export default async function DocumentSettingsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireUser();
  if (!can(user, "documents:configure")) return <Forbidden permission="documents:configure" />;

  const requested = (await searchParams).product;
  const product: Product = PRODUCTS.find((p) => p === requested) ?? "car";
  const [types, config, t, locale] = await Promise.all([
    db.select().from(documentTypes).orderBy(documentTypes.id),
    db.select().from(productDocuments).where(eq(productDocuments.product, product)),
    getTranslations(),
    getLocale(),
  ]);
  const level = new Map(config.map((c) => [c.documentTypeId, c.required ? "required" : "optional"]));
  const levelLabel = {
    none: t("documentSettings.notUsed"),
    optional: t("documentSettings.optional"),
    required: t("documentSettings.required"),
  };

  return (
    <>
      <PageHeader title={t("documentSettings.title")} description={t("documentSettings.description")} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="self-start">
          <CardHeader title={t("documentSettings.types")} />
          <ul>
            {types.map((type) => (
              <ListRow
                key={type.id}
                muted={!type.active}
                action={
                  <form action={toggleDocumentType}>
                    <Hidden name="documentTypeId" value={type.id} />
                    <Button size="sm" variant="ghost">
                      {type.active ? t("common.disable") : t("common.enable")}
                    </Button>
                  </form>
                }
              >
                <CellText primary={localized(type.name, locale)} secondary={localized(type.description, locale)} />
              </ListRow>
            ))}
          </ul>
          <CardBody className="border-t border-line bg-paper/50">
            <DocumentTypeForm />
          </CardBody>
        </Card>

        <div className="min-w-0">
          <PillNav
            label={t("plans.product")}
            items={PRODUCTS.map((p) => ({
              href: `/admin/documents?product=${p}`,
              label: t(`products.${p}`),
              active: p === product,
            }))}
          />
          <Card>
            <form key={product} action={saveProductDocuments}>
              <Hidden name="product" value={product} />
              <CardHeader
                title={t("documentSettings.checklist", { product: t(`products.${product}`) })}
                action={<Button variant="primary">{t("common.save")}</Button>}
              />
              <Table size="sm">
                <thead>
                  <tr>
                    <Th>{t("documentSettings.document")}</Th>
                    {LEVELS.map((l) => (
                      <Th key={l} className="text-center">
                        {levelLabel[l]}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {types
                    .filter((type) => type.active)
                    .map((type) => (
                      <Tr key={type.id}>
                        <Td>{localized(type.name, locale)}</Td>
                        {LEVELS.map((l) => (
                          <Td key={l} className="text-center">
                            <Radio
                              name={`doc-${type.id}`}
                              value={l}
                              defaultChecked={(level.get(type.id) ?? "none") === l}
                              aria-label={`${localized(type.name, locale)}: ${levelLabel[l]}`}
                            />
                          </Td>
                        ))}
                      </Tr>
                    ))}
                </tbody>
              </Table>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
