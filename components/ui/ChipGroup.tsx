"use client";

// Single-select chips. Real radio inputs underneath, so keyboard arrows,
// screen readers and form posts all work for free (like a Rails
// collection_radio_buttons styled as pills).
import { useId } from "react";

type Option<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
};

export function ChipGroup<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  name,
}: Props<T>) {
  const id = useId();
  const groupName = name ?? id;

  return (
    <fieldset>
      <legend className="mb-2 text-sm text-text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={String(option.value)} className="cursor-pointer">
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm text-text transition-colors hover:bg-surface-raised peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-text peer-checked:hover:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent sm:h-9">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
