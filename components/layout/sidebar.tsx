import { useTranslations } from "next-intl";
import { Avatar, Button, MotionHighlight } from "@/components/ui";
import { NAVIGATION } from "@/constants/navigation";
import { can, type SessionUser } from "@/lib/rbac";
import { logout } from "@/server/actions/auth";
import { LocaleSwitch } from "./locale-switch";
import { NavLink } from "./nav-link";

/** Dark side navigation on large screens, a scrollable top bar on small ones. Shows only what the role can open. */
export function Sidebar({ user }: { user: SessionUser }) {
  const t = useTranslations();
  const sections = NAVIGATION.map((s) => ({
    ...s,
    items: s.items.filter((i) => i.anyOf.some((p) => can(user, p))),
  })).filter((s) => s.items.length > 0);

  return (
    <aside className="bg-ink text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 lg:px-5 lg:pt-6 lg:pb-5">
        <span className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-sm font-bold">P</span>
          <span className="font-semibold tracking-tight">{t("app.name")}</span>
        </span>
        <span className="flex items-center gap-1 lg:hidden">
          <LocaleSwitch />
          <form action={logout}>
            <Button size="sm" variant="inverse">
              {t("common.switchRole")}
            </Button>
          </form>
        </span>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:pb-4"
        aria-label={t("nav.main")}
      >
        {sections.map((section) => (
          <div key={section.titleKey} className="flex gap-1 lg:flex-col">
            <p className="mt-5 mb-1 hidden px-3 text-xs text-white/40 first:mt-0 lg:block">{t(section.titleKey)}</p>
            <MotionHighlight tone="dark" className="flex gap-1 lg:flex-col">
              {section.items.map((item) => (
                <NavLink key={item.href} href={item.href} icon={item.icon} label={t(item.labelKey)} />
              ))}
            </MotionHighlight>
          </div>
        ))}
      </nav>

      <div className="hidden border-t border-white/10 p-4 lg:block">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={user.name} status="online" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-white/55">
              {user.roleName}
              {user.departmentKey && `, ${t(`departments.${user.departmentKey}`)}`}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <form action={logout}>
            <Button size="sm" variant="inverse">
              {t("common.switchRole")}
            </Button>
          </form>
          <LocaleSwitch />
        </div>
      </div>
    </aside>
  );
}
