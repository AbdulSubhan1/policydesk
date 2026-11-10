"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Autocomplete, type AutocompleteOption } from "@/components/ui";

/** An Autocomplete bound to a React Hook Form field. `onPick` runs after the field is updated. */
export function FormAutocomplete<T extends FieldValues>({
  control,
  name,
  options,
  placeholder,
  onPick,
}: {
  control: Control<T>;
  name: Path<T>;
  options: AutocompleteOption[];
  placeholder?: string;
  onPick?: (value: string) => void;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          ref={field.ref}
          value={field.value}
          onBlur={field.onBlur}
          onChange={(value) => {
            field.onChange(value);
            onPick?.(value);
          }}
          invalid={fieldState.invalid}
          options={options}
          placeholder={placeholder}
        />
      )}
    />
  );
}
