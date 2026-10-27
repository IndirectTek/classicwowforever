import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-base font-medium transition-colors " +
  "sm:h-10 disabled:cursor-not-allowed disabled:opacity-60 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-text hover:brightness-110",
  secondary: "border border-border text-text hover:bg-surface-raised",
  ghost: "text-text hover:bg-surface-raised",
};

// Shared with <Link> styled as a button, like a Rails `button_class` helper.
export function buttonClasses(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
