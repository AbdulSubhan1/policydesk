import { Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { OpportunityForm } from "./opportunity-form";

export default async function NewOpportunityPage() {
  const user = await requireUser();
  if (!can(user, "opportunities:create")) return <Forbidden permission="opportunities:create" />;

  return (
    <>
      <PageHeader title="New opportunity" description="It is routed to the department that handles the chosen product." />
      <OpportunityForm />
    </>
  );
}
