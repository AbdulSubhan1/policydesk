"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import type { z } from "zod";
import type { ActionResult } from "@/schemas/common";

/**
 * React Hook Form wired to a Zod schema and a server action.
 * The same schema validates in the browser (instant field errors) and again inside the action.
 */
export function useActionForm<S extends z.ZodType<FieldValues, FieldValues>>(
  schema: S,
  action: (values: z.output<S>) => Promise<ActionResult>,
  { defaultValues, resetOnSuccess = false }: { defaultValues: DefaultValues<z.input<S>>; resetOnSuccess?: boolean },
) {
  const form = useForm<z.input<S>, unknown, z.output<S>>({ resolver: zodResolver(schema), defaultValues });
  const [pending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await action(values);
      if (result && !result.ok) form.setError("root", { message: result.error });
      else if (resetOnSuccess) form.reset();
    }),
  );

  /** Message key of a field's error, for <Field error={...}>. */
  const errorOf = (name: Path<z.input<S>>) => form.getFieldState(name, form.formState).error?.message;

  return { form, pending, onSubmit, errorOf, rootError: form.formState.errors.root?.message };
}
