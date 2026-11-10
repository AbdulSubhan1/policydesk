import { Panel, Skeleton } from "@/components/ui";

/** Shown by loading.tsx while a list page loads: the header, the filters and a table's worth of rows. */
export function ListSkeleton() {
  return (
    <div aria-busy className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton shape="title" />
        <Skeleton className="max-w-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton shape="badge" />
        <Skeleton shape="badge" />
        <Skeleton shape="badge" />
      </div>
      <Panel flush>
        <div className="grid gap-5 p-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton shape="avatar" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="w-2/5" />
                <Skeleton className="w-1/4" />
              </div>
              <Skeleton shape="badge" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
