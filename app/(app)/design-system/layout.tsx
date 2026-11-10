import { LibraryNav } from "@/components/design-system/library-nav";
import { requireUser } from "@/server/auth";

export default async function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pe-1 pb-8">
          <LibraryNav />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
