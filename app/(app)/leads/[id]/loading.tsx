import { Panel, Skeleton } from "@/components/ui";

/** Shown while a lead opens: header, progress rail, the tab panel and the side column. */
export default function Loading() {
  return (
    <div aria-busy className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="w-24" />
        <Skeleton shape="title" />
        <Skeleton className="max-w-md" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} shape="control" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel flush>
          <div className="grid gap-4 p-5">
            <div className="flex gap-4">
              <Skeleton className="w-16" />
              <Skeleton className="w-16" />
              <Skeleton className="w-20" />
            </div>
            <Skeleton shape="block" />
            <Skeleton shape="control" />
          </div>
        </Panel>
        <Panel flush>
          <div className="grid gap-4 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton shape="avatar" />
                <div className="grid flex-1 gap-2">
                  <Skeleton />
                  <Skeleton className="w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
