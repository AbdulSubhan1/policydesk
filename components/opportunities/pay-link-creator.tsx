"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Field, FormError, Input, useToast } from "@/components/ui";
import { createPayLink } from "@/server/actions/website-payments";

/**
 * Creates the customer's payment link and shows it this once, to copy into a call note, chat or email. The page never
 * shows it again: only its hash is stored.
 */
export function PayLinkCreator({ opportunityId, hasLinks }: { opportunityId: number; hasLinks: boolean }) {
  const t = useTranslations("opportunities.online");
  const toast = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const create = () =>
    startTransition(async () => {
      const data = new FormData();
      data.set("id", String(opportunityId));
      const result = await createPayLink(data);
      setUrl(result.ok ? result.url : null);
      setError(result.ok ? undefined : result.error);
    });

  async function copy() {
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    toast({ title: t("copied") });
  }

  return (
    <div className="grid justify-items-start gap-3">
      {url && (
        <Field label={t("link")} hint={t("shownOnce")} group className="w-full">
          <div className="flex min-w-0 gap-2">
            <Input readOnly value={url} aria-label={t("link")} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" onClick={copy}>
              {t("copy")}
            </Button>
          </div>
        </Field>
      )}
      <FormError message={error} />
      <Button type="button" variant={url ? "secondary" : "primary"} disabled={pending} onClick={create}>
        {pending ? t("creating") : hasLinks || url ? t("createNew") : t("create")}
      </Button>
    </div>
  );
}
