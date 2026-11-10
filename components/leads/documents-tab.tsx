import { getLocale, getTranslations } from "next-intl/server";
import { UploadForm } from "@/components/forms/upload-form";
import { Badge, Button, ButtonLink, CellText, DataTable, Hidden, PanelSection } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { deleteDocument } from "@/server/actions/documents";
import { getDocuments, getLeadContext, getPolicy } from "@/server/queries/lead-details";

export async function DocumentsTab({ leadId }: { leadId: number }) {
  const [{ user, closed }, { files, checklist, uploaded }, policy, t, locale] = await Promise.all([
    getLeadContext(leadId),
    getDocuments(leadId),
    getPolicy(leadId),
    getTranslations("lead.documents"),
    getLocale(),
  ]);
  const typeName = new Map(checklist.map((d) => [d.id, localized(d.name, locale)]));

  return (
    <>
      <PanelSection className="flex flex-wrap gap-1.5 border-b border-line">
        {checklist.map((d) => (
          <Badge key={d.id} tone={uploaded.has(d.id) ? "green" : d.required ? "amber" : "grey"}>
            {localized(d.name, locale)}
            {d.required && !uploaded.has(d.id) && ` (${t("required")})`}
          </Badge>
        ))}
      </PanelSection>
      <DataTable
        embedded
        path={`/leads/${leadId}`}
        rows={files}
        rowKey={(d) => d.id}
        minWidth="sm"
        empty={{ title: t("emptyTitle"), description: t("empty"), icon: "fileSettings" }}
        columns={[
          {
            key: "file",
            header: t("file"),
            cell: (d) => (
              <CellText
                primary={d.fileName}
                secondary={t("meta", {
                  type: typeName.get(d.documentTypeId) ?? "",
                  size: Math.ceil(d.size / 1024),
                  user: d.uploadedBy ?? "",
                  date: shortDate(d.createdAt),
                })}
              />
            ),
          },
          {
            key: "actions",
            header: "",
            align: "end",
            nowrap: true,
            cell: (d) => (
              <span className="inline-flex gap-2">
                {can(user, "documents:download") && (
                  <ButtonLink size="sm" href={`/leads/${leadId}/documents/${d.id}`} target="_blank" prefetch={false}>
                    {t("view")}
                  </ButtonLink>
                )}
                {can(user, "documents:upload") && !policy && (
                  <form action={deleteDocument}>
                    <Hidden name="documentId" value={d.id} />
                    <Button size="sm" variant="danger">
                      {t("delete")}
                    </Button>
                  </form>
                )}
              </span>
            ),
          },
        ]}
      />
      {can(user, "documents:upload") && !closed && checklist.length > 0 && (
        <PanelSection muted>
          <UploadForm leadId={leadId} types={checklist} />
        </PanelSection>
      )}
    </>
  );
}
