"use client";

import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

type Tone = "success" | "error" | "info";
type Toast = { id: number; title: string; description?: string; tone: Tone };
type Show = (toast: Omit<Toast, "id" | "tone"> & { tone?: Tone }) => void;

const ToastContext = createContext<Show>(() => {});

const TONE: Record<Tone, { icon: IconName; className: string }> = {
  success: { icon: "check", className: "bg-brand-soft text-brand-strong" },
  error: { icon: "alert", className: "bg-risk-soft text-risk" },
  info: { icon: "info", className: "bg-info-soft text-info" },
};

/** Wraps the app once (root layout) and shows toasts in the bottom corner. They leave after five seconds. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("common");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((all) => all.filter((x) => x.id !== id));

  const show = useCallback<Show>(({ tone = "success", ...toast }) => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all.slice(-3), { id, tone, ...toast }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <ol
        data-ui="Toast"
        aria-live="polite"
        className="pointer-events-none fixed end-4 bottom-4 z-[60] grid w-80 max-w-[calc(100vw-2rem)] gap-2"
      >
        {toasts.map((toast) => (
          <li
            key={toast.id}
            className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border border-line bg-white p-3 shadow-lg shadow-ink/10"
          >
            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", TONE[toast.tone].className)}>
              <Icon name={TONE[toast.tone].icon} size={15} />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium text-ink">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-muted">{toast.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-muted hover:text-ink"
              aria-label={t("close")}
            >
              <Icon name="close" size={14} />
            </button>
          </li>
        ))}
      </ol>
    </ToastContext.Provider>
  );
}

/** Shows a toast from any client component: `toast({ title: t("saved") })`. */
export function useToast() {
  return useContext(ToastContext);
}
