import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "relative isolate inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md border border-transparent text-sm font-semibold transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive after:pointer-events-none after:absolute after:inset-y-0 after:left-[-140%] after:w-[65%] after:-skew-x-12 after:bg-linear-to-r after:from-transparent after:via-white/35 after:to-transparent after:opacity-0 after:transition-all after:duration-700 hover:-translate-y-0.5 hover:after:left-[140%] hover:after:opacity-100 active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "bg-linear-to-br from-slate-700 via-slate-800 to-slate-950 text-white shadow-[0_12px_28px_-12px_rgba(15,23,42,0.85)] hover:shadow-[0_20px_42px_-16px_rgba(15,23,42,0.72)]",
        destructive:
          "bg-linear-to-br from-red-700 via-red-800 to-zinc-950 text-white shadow-[0_12px_28px_-12px_rgba(127,29,29,0.8)] hover:shadow-[0_20px_42px_-16px_rgba(127,29,29,0.68)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-slate-300 bg-linear-to-br from-slate-50 via-white to-slate-100 text-slate-800 shadow-[0_10px_22px_-16px_rgba(15,23,42,0.38)] hover:border-slate-400 hover:text-slate-950 hover:shadow-[0_18px_36px_-20px_rgba(15,23,42,0.5)] dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-linear-to-br from-slate-600 via-slate-700 to-slate-900 text-slate-100 shadow-[0_12px_28px_-12px_rgba(30,41,59,0.8)] hover:shadow-[0_20px_42px_-16px_rgba(30,41,59,0.68)]",
        ghost:
          "text-slate-700 hover:bg-slate-100 hover:text-slate-950 hover:shadow-[0_14px_28px_-20px_rgba(15,23,42,0.4)] dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
