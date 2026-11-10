import { getLeadContext } from "@/server/queries/lead-details";

/**
 * Checks access before the page streams behind loading.tsx, so a lead outside the user's scope is a real
 * 404 response and not a 404 screen sent with status 200. The page reuses the same cached lookup.
 */
export default async function LeadLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  await getLeadContext((await params).id);
  return children;
}
