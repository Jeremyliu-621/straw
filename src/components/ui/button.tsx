"use client";

import Link from "next/link";
import { forwardRef, type CSSProperties, type ReactNode } from "react";

/**
 * Button — canonical Straw button, matching the landing page DNA.
 *
 * Variants
 *  • primary    Peach pill with a 1px hairline-black border. The
 *               waitlist / "Post a task" CTA on the marketing site.
 *  • secondary  White pill with a 1px hairline-black border. Same
 *               shape, neutral fill — for Cancel / Close / "view all".
 *  • ghost      Underline-free text link, black → 60% on hover. For
 *               tertiary actions ("Browse open tasks →").
 *  • danger     Inverted peach using the coral pastel. Reserved for
 *               destructive actions (Delete, Cancel competition).
 *
 * Sizes match the three sites the landing page uses:
 *  • sm   nav pill         (px-5 py-1.5  / 14px)
 *  • md   inline CTA       (px-5 py-2.5  / 14px)  — default
 *  • lg   hero / final CTA (px-6 py-3    / 15px)
 *
 * `href` turns the button into a `next/link` while keeping all
 * variant + size styling. Pass `target="_blank"` via `linkProps` if
 * you need it.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional leading icon (lucide). Sized automatically. */
  leadingIcon?: ReactNode;
  /** Optional trailing icon (lucide). Sized automatically. */
  trailingIcon?: ReactNode;
  /** Renders the button at full container width. */
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
}

interface ButtonAsButton extends ButtonBaseProps {
  href?: undefined;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  form?: string;
}

interface ButtonAsLink extends ButtonBaseProps {
  href: string;
  linkProps?: Omit<React.ComponentProps<typeof Link>, "href" | "className" | "style">;
  ariaLabel?: string;
}

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: {
    padding: "5px 18px",
    fontSize: "13.5px",
    height: "30px",
    gap: "6px",
  },
  md: {
    padding: "9px 20px",
    fontSize: "14px",
    height: "38px",
    gap: "8px",
  },
  lg: {
    padding: "11px 24px",
    fontSize: "15px",
    height: "44px",
    gap: "8px",
  },
};

const VARIANT_STYLES: Record<ButtonVariant, { rest: CSSProperties; hover: CSSProperties; disabled: CSSProperties }> = {
  primary: {
    rest: {
      backgroundColor: "#f7d4d0",
      color: "#111",
      border: "1px solid #111",
    },
    hover: {
      backgroundColor: "#fbe0dc",
    },
    disabled: {
      backgroundColor: "#f3e6e4",
      color: "#9b8b89",
      border: "1px solid #c9b8b6",
      cursor: "not-allowed",
    },
  },
  secondary: {
    rest: {
      backgroundColor: "#FDFCFC",
      color: "#111",
      border: "1px solid #111",
    },
    hover: {
      backgroundColor: "#f4f3f3",
    },
    disabled: {
      backgroundColor: "#FDFCFC",
      color: "#9aa0a6",
      border: "1px solid #c9c9c9",
      cursor: "not-allowed",
    },
  },
  ghost: {
    rest: {
      backgroundColor: "transparent",
      color: "#111",
      border: "1px solid transparent",
    },
    hover: {
      color: "rgba(17,17,17,0.6)",
    },
    disabled: {
      color: "#9aa0a6",
      cursor: "not-allowed",
    },
  },
  danger: {
    rest: {
      backgroundColor: "#fbe2dd",
      color: "#7a1d10",
      border: "1px solid #7a1d10",
    },
    hover: {
      backgroundColor: "#f7cfc7",
    },
    disabled: {
      backgroundColor: "#f4ddd9",
      color: "#b18d87",
      border: "1px solid #d6b3ad",
      cursor: "not-allowed",
    },
  },
};

function baseStyle(variant: ButtonVariant, size: ButtonSize, fullWidth: boolean): CSSProperties {
  return {
    ...SIZE_STYLES[size],
    ...VARIANT_STYLES[variant].rest,
    display: fullWidth ? "flex" : "inline-flex",
    width: fullWidth ? "100%" : undefined,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius)",
    fontWeight: 500,
    lineHeight: 1,
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition:
      "background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease",
  };
}

function applyHover(el: HTMLElement, variant: ButtonVariant) {
  const h = VARIANT_STYLES[variant].hover;
  if (h.backgroundColor) el.style.backgroundColor = h.backgroundColor as string;
  if (h.color) el.style.color = h.color as string;
  if (h.border) el.style.border = h.border as string;
}

function resetHover(el: HTMLElement, variant: ButtonVariant) {
  const r = VARIANT_STYLES[variant].rest;
  if (r.backgroundColor !== undefined) el.style.backgroundColor = r.backgroundColor as string;
  if (r.color !== undefined) el.style.color = r.color as string;
  if (r.border !== undefined) el.style.border = r.border as string;
}

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(props, _ref) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const fullWidth = props.fullWidth ?? false;
  const cls = ["font-sans", props.className].filter(Boolean).join(" ");
  const inner = (
    <>
      {props.leadingIcon && <span aria-hidden="true" style={{ display: "inline-flex" }}>{props.leadingIcon}</span>}
      <span>{props.children}</span>
      {props.trailingIcon && <span aria-hidden="true" style={{ display: "inline-flex" }}>{props.trailingIcon}</span>}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        className={cls}
        aria-label={props.ariaLabel}
        style={baseStyle(variant, size, fullWidth)}
        onMouseEnter={(e) => applyHover(e.currentTarget, variant)}
        onMouseLeave={(e) => resetHover(e.currentTarget, variant)}
        onFocus={(e) => applyHover(e.currentTarget, variant)}
        onBlur={(e) => resetHover(e.currentTarget, variant)}
        {...props.linkProps}
      >
        {inner}
      </Link>
    );
  }

  const isDisabled = "disabled" in props && props.disabled;
  const style: CSSProperties = isDisabled
    ? { ...baseStyle(variant, size, fullWidth), ...VARIANT_STYLES[variant].disabled }
    : baseStyle(variant, size, fullWidth);

  return (
    <button
      type={("type" in props && props.type) || "button"}
      onClick={"onClick" in props ? props.onClick : undefined}
      disabled={isDisabled}
      aria-label={props.ariaLabel}
      aria-expanded={"ariaExpanded" in props ? props.ariaExpanded : undefined}
      form={"form" in props ? props.form : undefined}
      className={cls}
      style={style}
      onMouseEnter={(e) => !isDisabled && applyHover(e.currentTarget, variant)}
      onMouseLeave={(e) => !isDisabled && resetHover(e.currentTarget, variant)}
      onFocus={(e) => !isDisabled && applyHover(e.currentTarget, variant)}
      onBlur={(e) => !isDisabled && resetHover(e.currentTarget, variant)}
    >
      {inner}
    </button>
  );
});
