"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/cn";

export function NavLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2.5 rounded-md px-3 text-sm whitespace-nowrap transition-colors",
        // The background comes from the sidebar's MotionHighlight, which rests on aria-current
        active ? "font-medium text-white" : "text-white/65 hover:text-white",
      )}
    >
      <Icon name={icon} className={active ? "text-brand-soft" : "text-white/45"} />
      {label}
    </Link>
  );
}
