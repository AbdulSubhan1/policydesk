import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// UI library rules (see AGENTS.md): raw controls and inline styles live only inside components/ui
const NO_INLINE_STYLE = {
  selector: "JSXAttribute[name.name='style']",
  message: "Inline styles are not allowed. Use Tailwind classes or a components/ui component.",
};
const NO_RAW_ELEMENTS = ["button", "input", "select", "textarea", "a", "img", "svg"].map((tag) => ({
  selector: `JSXOpeningElement[name.name='${tag}']`,
  message: `Raw <${tag}> is not allowed outside components/ui. Use the library component (Button, Input, Hidden, Select, Textarea, ButtonLink, Link, Icon).`,
}));

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@mui/*",
                "@chakra-ui/*",
                "@radix-ui/*",
                "@headlessui/*",
                "antd",
                "lucide-react",
                "react-icons",
                "@heroicons/*",
                "clsx",
                "tailwind-merge",
                "class-variance-authority",
              ],
              message: "Only our own UI library (components/ui) is allowed. Add what you need there.",
            },
          ],
        },
      ],
      "no-restricted-syntax": ["error", NO_INLINE_STYLE, ...NO_RAW_ELEMENTS],
    },
  },
  {
    files: ["components/ui/**"],
    rules: { "no-restricted-syntax": ["error", NO_INLINE_STYLE] },
  },
];

export default eslintConfig;
