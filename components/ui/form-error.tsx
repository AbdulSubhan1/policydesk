import { useTranslations } from "next-intl";

/** Form-level error. `message` is a message key such as "errors.invalidLogin". */
export function FormError({ message }: { message?: string }) {
  const t = useTranslations();
  if (!message) return null;
  return (
    <p data-ui="FormError" role="alert" className="text-sm text-risk">
      {t.has(message) ? t(message) : message}
    </p>
  );
}
