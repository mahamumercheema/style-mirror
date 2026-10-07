import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Atelier Ora buttons: uppercase, letter-spaced, 1px border, no fill.
 * Hover/press add a soft amber glow; primary (default) actions are amber.
 */
const GLOW =
  "hover:shadow-[0_0_14px_rgb(199_157_132/0.35)] hover:[text-shadow:0_0_8px_rgb(199_157_132/0.5)] active:shadow-[0_0_18px_rgb(199_157_132/0.5)]";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border bg-transparent text-[11px] font-medium uppercase tracking-[0.2em] cursor-pointer transition-[color,border-color,background-color,box-shadow,text-shadow] duration-250 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: `border-gold text-foreground hover:bg-gold/10 ${GLOW}`,
        destructive: `border-destructive/70 text-destructive hover:bg-destructive/10`,
        outline: `border-foreground/60 text-foreground hover:border-gold hover:text-gold-ink ${GLOW}`,
        secondary: `border-border text-foreground/85 hover:border-gold/60 hover:text-gold-ink ${GLOW}`,
        ghost: `border-transparent text-muted-foreground hover:text-gold-ink hover:[text-shadow:0_0_8px_rgb(199_157_132/0.5)]`,
        link: "border-transparent normal-case tracking-normal text-gold-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-11 px-8",
        icon: "h-9 w-9 tracking-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
