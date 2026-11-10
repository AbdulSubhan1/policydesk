import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Marked } from "marked";

// The knowledge base is the Markdown in docs/ plus AGENTS.md. The same files are what AI agents read.
const DOCS_DIR = join(process.cwd(), "docs");
const STANDARD = join(process.cwd(), "AGENTS.md");

export type KbPage = { slug: string; title: string; path: string };

// ```mermaid blocks become <pre class="mermaid">, which the client turns into diagrams
const marked = new Marked({
  renderer: {
    code({ text, lang }) {
      const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return lang === "mermaid" ? `<pre class="mermaid">${escaped}</pre>` : `<pre><code>${escaped}</code></pre>`;
    },
  },
});

function titleOf(markdown: string, fallback: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback;
}

export async function listKbPages(): Promise<KbPage[]> {
  const files = (await readdir(DOCS_DIR)).filter((f) => f.endsWith(".md")).sort();
  const pages = await Promise.all(
    files.map(async (file) => ({
      slug: file.replace(/^\d+-/, "").replace(/\.md$/, ""),
      title: titleOf(await readFile(join(DOCS_DIR, file), "utf8"), file),
      path: `docs/${file}`,
    })),
  );
  return [
    ...pages,
    { slug: "coding-standard", title: titleOf(await readFile(STANDARD, "utf8"), "Coding standard"), path: "AGENTS.md" },
  ];
}

export async function getKbPage(slug: string) {
  const page = (await listKbPages()).find((p) => p.slug === slug);
  if (!page) return null;
  const markdown = await readFile(join(process.cwd(), page.path), "utf8");
  return { ...page, html: await marked.parse(markdown) };
}
