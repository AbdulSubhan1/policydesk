import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { KbArticle } from "@/components/kb/kb-article";
import { PageHeader, PillNav } from "@/components/ui";
import { requireUser } from "@/server/auth";
import { getKbPage, listKbPages } from "@/server/queries/kb";

export default async function KnowledgeBasePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  await requireUser();
  const [pages, t] = await Promise.all([listKbPages(), getTranslations("nav")]);
  const slug = (await params).slug?.[0] ?? pages[0].slug;
  const page = await getKbPage(slug);
  if (!page) notFound();

  return (
    <>
      <PageHeader title={t("kb")} />
      <PillNav
        label={t("kb")}
        items={pages.map((p) => ({ href: `/kb/${p.slug}`, label: p.title, active: p.slug === slug }))}
      />
      <KbArticle html={page.html} path={page.path} />
    </>
  );
}
