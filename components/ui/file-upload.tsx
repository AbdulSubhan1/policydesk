"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Shown under the prompt, e.g. "PDF, JPG or PNG up to 2 MB". */
  hint?: string;
  invalid?: boolean;
  ref?: React.Ref<HTMLInputElement>;
};

function size(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * A drop zone around a real file input: drag files onto it or click to browse. The chosen files are listed
 * with a remove button. Works in plain forms and with React Hook Form register().
 */
export function FileUpload({ hint, invalid, className, ref, onChange, ...props }: Props) {
  const t = useTranslations("common");
  const inner = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  // React Hook Form's reset() resets the <form>, which empties the input but fires no change event
  useEffect(() => {
    const form = inner.current?.form;
    const clear = () => setFiles([]);
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);

  // Replaces the input's files and fires change so forms and React Hook Form see it
  function setInputFiles(list: File[]) {
    const input = inner.current;
    if (!input) return;
    const transfer = new DataTransfer();
    list.forEach((f) => transfer.items.add(f));
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div data-ui="FileUpload" className="grid min-w-0 gap-2">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          setInputFiles(Array.from(e.dataTransfer.files).slice(0, props.multiple ? undefined : 1));
        }}
        className={cn(
          "grid cursor-pointer justify-items-center gap-1.5 rounded-lg border border-dashed border-line bg-white px-4 py-6 text-center transition-colors focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/15 hover:border-brand/50 hover:bg-brand-soft/40",
          dragging && "border-brand bg-brand-soft",
          invalid && "border-risk",
          className,
        )}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-paper text-ink-soft">
          <Icon name="upload" size={18} />
        </span>
        <span className="text-sm font-medium">{t("dropFiles")}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
        <input
          ref={(node) => {
            inner.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          type="file"
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setFiles(Array.from(e.target.files ?? []));
            onChange?.(e);
          }}
          className="sr-only"
          {...props}
        />
      </label>
      {files.length > 0 && (
        <ul className="grid gap-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex min-w-0 animate-fade-in items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm"
            >
              <Icon name="clipboard" size={16} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted tabular-nums">{size(file.size)}</span>
              <button
                type="button"
                aria-label={`${t("delete")} ${file.name}`}
                onClick={() => setInputFiles(files.filter((_, k) => k !== i))}
                className="shrink-0 rounded text-muted outline-none hover:text-risk focus-visible:ring-3 focus-visible:ring-brand/25"
              >
                <Icon name="close" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
