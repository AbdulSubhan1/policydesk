import { getLocale, getTranslations } from "next-intl/server";
import { UploadForm } from "@/components/forms/upload-form";
import { Badge, Button, ButtonLink, CardBody, CellText, EmptyRow, Hidden, Table, Td, Tr } from "@/components/ui";
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
      <CardBody className="flex flex-wrap gap-1.5">
        {checklist.map((d) => (
          <Badge key={d.id} tone={uploaded.has(d.id) ? "green" : d.required ? "amber" : "grey"}>
            {localized(d.name, locale)}
            {d.required && !uploaded.has(d.id) && ` (${t("required")})`}
          </Badge>
        ))}
      </CardBody>
      <Table size="sm">
        <tbody>
          {files.length === 0 && <EmptyRow colSpan={2}>{t("empty")}</EmptyRow>}
          {files.map((d) => (
            <Tr key={d.id}>
              <Td>
                <CellText
                  primary={d.fileName}
                  secondary={t("meta", {
                    type: typeName.get(d.documentTypeId) ?? "",
                    size: Math.ceil(d.size / 1024),
                    user: d.uploadedBy ?? "",
                    date: shortDate(d.createdAt),
                  })}
                />
              </Td>
              <Td className="w-px text-end whitespace-nowrap">
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
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {can(user, "documents:upload") && !closed && checklist.length > 0 && (
        <CardBody className="bg-paper/50">
          <UploadForm leadId={leadId} types={checklist} />
        </CardBody>
      )}
    </>
  );
}
