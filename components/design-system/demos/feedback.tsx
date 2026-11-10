import { useTranslations } from "next-intl";
import { Alert, ButtonLink, EmptyState, Forbidden, Panel, Progress, Skeleton, Spinner } from "@/components/ui";
import { Demo, type DemoProps } from "../demo";
import { ToastDemo } from "../toast-demo";

/** Messages, loading states and empty states. */
export function FeedbackDemos({ name, path }: DemoProps) {
  const t = useTranslations();

  switch (name) {
    case "Alert":
      return (
        <>
          <Demo title="Tones">
            <div className="grid gap-3">
              <Alert title={t("lead.kyc.waiting")} />
              <Alert tone="success" title={t("lead.policy.ready", { insurer: "Northwind", amount: "$1,200" })} />
              <Alert tone="warning" title={t("lead.policy.notReady")}>
                {t("lead.policy.needsDocuments", { list: "Emirates ID, Driving licence" })}
              </Alert>
              <Alert tone="danger" title={t("errors.generalTitle")}>
                {t("errors.generalBody")}
              </Alert>
            </div>
          </Demo>
          <Demo title="With an action">
            <Alert
              tone="warning"
              title={t("lead.policy.needsKyc")}
              action={
                <ButtonLink href={path} size="sm">
                  {t("lead.tabs.kyc")}
                </ButtonLink>
              }
            />
          </Demo>
        </>
      );
    case "Toast":
      return (
        <Demo title="Types" description="Each toast leaves after five seconds; at most four show at once.">
          <ToastDemo />
        </Demo>
      );
    case "EmptyState":
      return (
        <Demo title="With a next step" description="Say what is missing, why, and what to do.">
          <Panel flush>
            <EmptyState
              icon="shield"
              title={t("dashboard.noRenewals")}
              description={t("dashboard.renewalsHint", { days: 45 })}
              action={<ButtonLink href={path}>{t("nav.policies")}</ButtonLink>}
            />
          </Panel>
        </Demo>
      );
    case "Skeleton":
      return (
        <>
          <Demo title="Table" description="Compose shapes in the layout of the real content.">
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton shape="avatar" />
                  <div className="grid flex-1 gap-2">
                    <Skeleton className="w-2/5" />
                    <Skeleton className="w-1/4" />
                  </div>
                  <Skeleton shape="badge" />
                </div>
              ))}
            </div>
          </Demo>
          <Demo title="Form">
            <div className="grid max-w-sm gap-3">
              <Skeleton shape="title" />
              <Skeleton shape="control" />
              <Skeleton shape="control" />
              <Skeleton shape="block" />
            </div>
          </Demo>
        </>
      );
    case "Spinner":
      return (
        <Demo title="Sizes">
          <div className="flex items-center gap-4">
            <Spinner size="sm" label={t("lead.kyc.submitting")} />
            <Spinner label={t("lead.kyc.submitting")} />
            <Spinner size="lg" label={t("lead.kyc.submitting")} />
          </div>
        </Demo>
      );
    case "Progress":
      return (
        <>
          <Demo title="With label">
            <div className="grid max-w-md gap-4">
              <Progress label={t("lead.tabs.documents")} value={3} max={5} />
              <Progress label={t("lead.tabs.kyc")} value={100} />
            </div>
          </Demo>
          <Demo title="Bar only" description="Show the number next to it, as the dashboard funnel does.">
            <div className="grid max-w-md gap-2">
              <Progress value={2} max={10} />
              <Progress value={7} max={10} />
            </div>
          </Demo>
        </>
      );
    case "Forbidden":
      return (
        <Demo title="Missing permission">
          <Forbidden permission="kyc:review" />
        </Demo>
      );
    default:
      return null;
  }
}
