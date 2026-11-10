import { getTranslations } from "next-intl/server";
import { OpportunityForm } from "@/components/forms/opportunity-form";
import { Forbidden, PageHeader } from "@/components/ui";
import { can } from "@/lib/rbac";
import { requireUser } from "@/server/auth";

export default async function NewOpportunityPage() {
  const user = await requireUser();
  if (!can(user, "opportunities:create")) return <Forbidden permission="opportunities:create" />;
  const t = await getTranslations("opportunities");

  return (
    <>
      <PageHeader
        back={{ href: "/opportunities", label: t("title") }}
        title={t("new")}
        description={t("newDescription")}
      />
      <OpportunityForm />
    </>
  );
}
