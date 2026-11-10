"use client";

import { useEffect } from "react";

/** Turns every <pre class="mermaid"> on the page into a diagram. Mermaid loads only on KB pages. */
export function MermaidDiagrams() {
  useEffect(() => {
    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: "neutral", fontFamily: "inherit" });
      mermaid.run({ querySelector: "pre.mermaid" });
    });
  }, []);
  return null;
}
