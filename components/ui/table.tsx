import { cn } from "@/lib/cn";

// Below this width the table scrolls sideways instead of squashing its columns
const MIN_WIDTH = { sm: "min-w-[560px]", md: "min-w-[720px]", lg: "min-w-[880px]" } as const;

export function Table({ children, size = "md" }: { children: React.ReactNode; size?: keyof typeof MIN_WIDTH }) {
  return (
    <div data-ui="Table" className="overflow-x-auto">
      <table className={cn("w-full text-sm", MIN_WIDTH[size])}>{children}</table>
    </div>
  );
}
