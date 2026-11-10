import { getLocale, getTranslations } from "next-intl/server";
import { DocumentTypeForm } from "@/components/forms/document-type-form";
import {
  Button,
  CellText,
  DataTable,
  Forbidden,
  Hidden,
  ListRow,
  PageHeader,
  Panel,
  PillNav,
  Radio,
} from "@/components/ui";
import { PRODUCTS, type Product } from "@/constants/products";
import { localized } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { saveProductDocuments, toggleDocumentType } from "@/server/actions/document-settings";
import { requireUser } from "@/server/auth";
import { listDocumentTypes, productChecklist } from "@/server/queries/documents";

const LEVELS = ["none", "optional", "required"] as const;

export default async function DocumentSettingsPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireUser();
  if (!can(user, "documents:configure")) return <Forbidden permission="documents:configure" />;

  const requested = (await searchParams).product;
  const product: Product = PRODUCTS.find((p) => p === requested) ?? "car";
  const [types, checklist, t, locale] = await Promise.all([
    listDocumentTypes(),
    productChecklist(product),
    getTranslations(),
    getLocale(),
  ]);
  const levelLabel = {
    none: t("documentSettings.notUsed"),
    optional: t("documentSettings.optional"),
    required: t("documentSettings.required"),
  };
  const formId = `checklist-${product}`;

  return (
    <>
      <PageHeader title={t("documentSettings.title")} description={t("documentSettings.description")} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title={t("documentSettings.types")} flush footer={<DocumentTypeForm />} className="self-start">
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
        </Panel>

        <div className="min-w-0">
          <PillNav
            label={t("plans.product")}
            items={PRODUCTS.map((p) => ({
              href: `/admin/documents?product=${p}`,
              label: t(`products.${p}`),
              active: p === product,
            }))}
          />
          <Panel
            title={t("documentSettings.checklist", { product: t(`products.${product}`) })}
            flush
            actions={
              <Button variant="primary" form={formId}>
                {t("common.save")}
              </Button>
            }
          >
            <form id={formId} key={product} action={saveProductDocuments}>
              <Hidden name="product" value={product} />
              <DataTable
                embedded
                path="/admin/documents"
                rows={types.filter((type) => type.active)}
                rowKey={(type) => type.id}
                minWidth="sm"
                empty={{ title: t("documentSettings.types"), icon: "fileSettings" }}
                columns={[
                  {
                    key: "document",
                    header: t("documentSettings.document"),
                    cell: (type) => localized(type.name, locale),
                  },
                  ...LEVELS.map((level) => ({
                    key: level,
                    header: levelLabel[level],
                    align: "center" as const,
                    cell: (type: (typeof types)[number]) => (
                      <Radio
                        name={`doc-${type.id}`}
                        value={level}
                        defaultChecked={(checklist.get(type.id) ?? "none") === level}
                        aria-label={`${localized(type.name, locale)}: ${levelLabel[level]}`}
                      />
                    ),
                  })),
                ]}
              />
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
