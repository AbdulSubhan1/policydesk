import { Panel } from "@/components/ui";
import { MermaidDiagrams } from "./mermaid-diagrams";

/** Renders a knowledge base page. The HTML comes from our own Markdown files in the repo. */
export function KbArticle({ html, path }: { html: string; path: string }) {
  return (
    <Panel footer={<p className="font-mono text-xs text-muted">{path}</p>}>
      <div className="kb-prose" dangerouslySetInnerHTML={{ __html: html }} />
      <MermaidDiagrams />
    </Panel>
  );
}
