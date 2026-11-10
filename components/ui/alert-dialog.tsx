"use client";

import { useTranslations } from "next-intl";
import { Button } from "./button";
import { Dialog } from "./dialog";

type Props = {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** What the action affects, e.g. the selected rows. */
  children?: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
};

/**
 * Asks before something that can't be undone. Put it inside the <form> of a one-click server action:
 * the confirm button is a submit button, so confirming submits that form.
 */
export function AlertDialog({ trigger, title, description, children, confirmLabel, tone = "danger" }: Props) {
  const t = useTranslations("common");
  return (
    <Dialog
      trigger={trigger}
      title={title}
      description={description ?? t("cannotUndo")}
      size="sm"
      closeLabel={t("cancel")}
      footer={
        <>
          <Button type="button" data-dialog-close variant="secondary">
            {t("cancel")}
          </Button>
          <Button type="submit" variant={tone === "danger" ? "danger" : "primary"}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
