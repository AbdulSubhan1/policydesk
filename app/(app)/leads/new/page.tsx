import { Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { LeadForm } from "./lead-form";

export default async function NewLeadPage() {
  const user = await requireUser();
  if (!can(user, "leads:create")) return <Forbidden permission="leads:create" />;

  return (
    <>
      <PageHeader
        title="New lead"
        description={can(user, "leads:assign") ? "You can assign it to an agent afterwards." : "The lead will be assigned to you."}
      />
      <LeadForm />
    </>
  );
}
