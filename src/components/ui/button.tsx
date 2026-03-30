"use client";

import { Button as ButtonPrimitive } from "@base-ui-components/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-[disabled=true]:pointer-events-none aria-[disabled=true]:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-7 gap-1 rounded-md px-2.5 text-[0.8rem]",
        lg: "h-9 gap-1.5 px-3",
        icon: "size-8",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-7 rounded-md",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  render?: React.ReactElement<Record<string, unknown>>;
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled = false,
  render,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const sharedProps = {
    "data-slot": "button" as const,
    className: cn(buttonVariants({ variant, size, className })),
    "aria-disabled": isDisabled ? ("true" as const) : undefined,
    "aria-busy": loading ? ("true" as const) : undefined,
    disabled: isDisabled,
    onClick: isDisabled ? undefined : onClick,
    ...props,
  };

  const content = (
    <>
      {loading && <Spinner />}
      <span className={cn(loading && "opacity-70")}>{children}</span>
    </>
  );

  if (render) {
    return (
      <ButtonPrimitive
        {...sharedProps}
        nativeButton={false}
        render={render}
        suppressHydrationWarning
      >
        {content}
      </ButtonPrimitive>
    );
  }

  return (
    <ButtonPrimitive {...sharedProps} nativeButton>
      {content}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
