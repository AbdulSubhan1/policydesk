/**
 * Writes components/ui/usage.json: for every UI library component, the files that render it.
 * Run with `npm run ui:usage` after changing UI; `npm run check` fails if the file is out of date.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { UI_REGISTRY } from "../components/ui/registry";

const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "components/ui/usage.json");
const SCAN = ["app", "components"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    // The library itself and its showcase are not "usage"
    if (statSync(path).isDirectory()) return /components\/(ui|design-system)$/.test(path) ? [] : files(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const sources = SCAN.flatMap((dir) => files(join(ROOT, dir))).map((path) => ({
  path: relative(ROOT, path),
  text: readFileSync(path, "utf8"),
}));

const registered = new Set(UI_REGISTRY.map((c) => c.file));
const unregistered = readdirSync(join(ROOT, "components/ui")).filter((f) => f.endsWith(".tsx") && !registered.has(f));
if (unregistered.length) {
  console.error(`Add these components to components/ui/registry.ts: ${unregistered.join(", ")}`);
  process.exit(1);
}

const usage = Object.fromEntries(
  UI_REGISTRY.map(({ name }) => [
    name,
    sources
      .filter((s) => new RegExp(`<${name}[\\s>/]`).test(s.text))
      .map((s) => s.path)
      .sort(),
  ]),
);

const next = JSON.stringify(usage, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const current = (() => {
    try {
      return readFileSync(OUT, "utf8");
    } catch {
      return "";
    }
  })();
  if (current !== next) {
    console.error("components/ui/usage.json is out of date. Run `npm run ui:usage`.");
    process.exit(1);
  }
} else {
  writeFileSync(OUT, next);
  console.log(`Wrote usage for ${UI_REGISTRY.length} components`);
}
