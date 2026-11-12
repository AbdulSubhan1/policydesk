"use client";

import { useRouter } from "next/navigation";
import { withParams, type SearchParams } from "@/lib/url";
import { Autocomplete, type AutocompleteOption } from "./autocomplete";
import { Checkbox } from "./checkbox";

/** A dropdown filter on URL parameter `name`. The first entry is "any", labelled by `placeholder`. */
export type TableSelect = { name: string; label: string; placeholder: string; options: AutocompleteOption[] };
/** An on/off filter: `name=1` in the URL while ticked. */
export type TableToggle = { name: string; label: string };

/** Dropdown and on/off filters for a DataTable. Each change goes straight to the URL, back to page 1. */
export function TableFilters({
  path,
  params,
  selects = [],
  toggles = [],
}: {
  path: string;
  params: SearchParams;
  selects?: TableSelect[];
  toggles?: TableToggle[];
}) {
  const router = useRouter();
  const go = (name: string, value?: string) =>
    router.push(withParams(path, params, { [name]: value, page: undefined }));

  return (
    <div data-ui="TableFilters" className="flex min-w-0 flex-wrap items-center gap-3">
      {selects.map((s) => (
        <Autocomplete
          key={s.name}
          aria-label={s.label}
          options={[{ value: "", label: s.placeholder }, ...s.options]}
          value={params[s.name] ?? ""}
          onChange={(value) => go(s.name, value || undefined)}
          className="w-full sm:w-48"
        />
      ))}
      {toggles.map((toggle) => (
        // Uncontrolled so the tick shows at once; the key resets it when the URL changes underneath
        <Checkbox
          key={`${toggle.name}-${params[toggle.name]}`}
          label={toggle.label}
          defaultChecked={params[toggle.name] === "1"}
          onChange={(e) => go(toggle.name, e.target.checked ? "1" : undefined)}
        />
      ))}
    </div>
  );
}
