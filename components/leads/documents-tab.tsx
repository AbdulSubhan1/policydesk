import { getLocale, getTranslations } from "next-intl/server";
import { UploadForm } from "@/components/forms/upload-form";
import { AlertDialog, Badge, Button, ButtonLink, CellText, DataTable, Hidden, PanelSection } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { localized } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { leadPath } from "@/lib/reference";
import { deleteDocument } from "@/server/actions/documents";
import { isDemoLocked } from "@/server/demo-lock";
import { getDocuments, getLeadContext, getPolicy } from "@/server/queries/lead-details";

export async function DocumentsTab({ leadId }: { leadId: number }) {
  const [{ user, lead, closed }, { files, checklist, uploaded }, policy, t, locale, locked, tDemo] = await Promise.all([
    getLeadContext(leadId),
    getDocuments(leadId),
    getPolicy(leadId),
    getTranslations("lead.documents"),
    getLocale(),
    isDemoLocked(),
    getTranslations("demo"),
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
        path={leadPath(lead.publicId)}
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
                  <ButtonLink
                    size="sm"
                    href={`${leadPath(lead.publicId)}/documents/${d.id}`}
                    target="_blank"
                    prefetch={false}
                  >
                    {t("view")}
                  </ButtonLink>
                )}
                {can(user, "documents:upload") && !policy && !locked && (
                  <form action={deleteDocument}>
                    <Hidden name="documentId" value={d.id} />
                    <AlertDialog
                      trigger={
                        <Button type="button" size="sm" variant="danger">
                          {t("delete")}
                        </Button>
                      }
                      title={t("deleteTitle", { name: d.fileName })}
                      confirmLabel={t("delete")}
                    />
                  </form>
                )}
              </span>
            ),
          },
        ]}
      />
      {can(user, "documents:upload") && !closed && checklist.length > 0 && (
        <PanelSection muted>
          {locked ? (
            // Files are stored in the database, so the live demo takes none
            <p className="text-sm text-muted">{tDemo("uploadsOff")}</p>
          ) : (
            <UploadForm leadId={leadId} types={checklist} />
          )}
        </PanelSection>
      )}
    </>
  );
}
