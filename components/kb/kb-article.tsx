import { Card, CardBody } from "@/components/ui";
import { MermaidDiagrams } from "./mermaid-diagrams";

/** Renders a knowledge base page. The HTML comes from our own Markdown files in the repo. */
export function KbArticle({ html, path }: { html: string; path: string }) {
  return (
    <Card>
      <CardBody className="kb-prose" dangerouslySetInnerHTML={{ __html: html }} />
      <p className="border-t border-line px-5 py-3 font-mono text-xs text-muted">{path}</p>
      <MermaidDiagrams />
    </Card>
  );
}
