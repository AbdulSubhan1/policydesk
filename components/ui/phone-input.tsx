"use client";

import { useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, splitPhone } from "@/constants/countries";
import { cn } from "@/lib/cn";
import { Autocomplete } from "./autocomplete";
import { control } from "./styles";

const OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.dial}`, hint: c.name }));

type Props = {
  /** Submitted with plain forms through a hidden input, as +<code><number>. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  /** Country picked when the value is empty, e.g. "AE". */
  defaultCountry?: string;
  /** Keep the country fixed to defaultCountry; only the number can be typed. */
  lockCountry?: boolean;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  ref?: React.Ref<HTMLInputElement>;
  "aria-label"?: string;
};

/** Country code + number, stored as one E.164 string (+971501234567). Validate it with `phone` from schemas/fields. */
export function PhoneInput({
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  defaultCountry = DEFAULT_COUNTRY,
  lockCountry,
  placeholder,
  invalid,
  disabled,
  ref,
  ...aria
}: Props) {
  const initial = splitPhone(value ?? defaultValue);
  const [countryCode, setCountryCode] = useState(
    lockCountry ? defaultCountry : (initial.country?.code ?? defaultCountry),
  );
  const [inner, setInner] = useState(initial.national);
  // Controlled from React Hook Form, the number comes from the value; otherwise from local state
  const national = value === undefined ? inner : splitPhone(value).national;
  const country = COUNTRIES.find((c) => c.code === countryCode)!;

  function emit(nextCountry: string, nextNational: string) {
    setInner(nextNational);
    const dial = COUNTRIES.find((c) => c.code === nextCountry)!.dial;
    onChange?.(nextNational ? `${dial}${nextNational}` : "");
  }

  return (
    <div data-ui="PhoneInput" className="flex min-w-0 gap-2">
      {name && <input type="hidden" name={name} value={national ? `${country.dial}${national}` : ""} />}
      <Autocomplete
        className="w-32 shrink-0"
        aria-label={country.name}
        options={OPTIONS}
        value={countryCode}
        disabled={disabled || lockCountry}
        onChange={(code) => {
          setCountryCode(code);
          emit(code, national);
        }}
      />
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        aria-label={aria["aria-label"]}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        maxLength={country.max}
        placeholder={placeholder ?? "5".padEnd(country.max, "0")}
        value={national}
        onChange={(e) => emit(countryCode, e.target.value.replace(/\D/g, ""))}
        onBlur={onBlur}
        className={cn(control, "tabular-nums")}
      />
    </div>
  );
}
