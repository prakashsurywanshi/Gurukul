import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './utils';

const buttonVariants = cva(
    "relative isolate inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md border border-transparent text-sm font-semibold transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive after:pointer-events-none after:absolute after:inset-y-0 after:left-[-140%] after:w-[65%] after:-skew-x-12 after:bg-linear-to-r after:from-transparent after:via-white/35 after:to-transparent after:opacity-0 after:transition-all after:duration-700 hover:-translate-y-0.5 hover:after:left-[140%] hover:after:opacity-100 active:translate-y-0",
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow-[0_12px_28px_-12px_rgba(15,23,42,0.85)] hover:bg-primary/90 hover:shadow-[0_20px_42px_-16px_rgba(15,23,42,0.72)]',
                destructive:
                    'bg-[#dc2626] text-white shadow-[0_12px_28px_-12px_rgba(220,38,38,0.8)] hover:bg-[#b91c1c] hover:shadow-[0_20px_42px_-16px_rgba(220,38,38,0.68)] focus-visible:ring-[#dc2626]/20 dark:focus-visible:ring-[#dc2626]/40',
                outline:
                    'border-border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground',
                secondary:
                    'bg-secondary text-secondary-foreground shadow-[0_12px_28px_-12px_rgba(30,41,59,0.8)] hover:bg-secondary/80 hover:shadow-[0_20px_42px_-16px_rgba(30,41,59,0.68)]',
                ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-[0_14px_28px_-20px_rgba(15,23,42,0.4)]',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 px-4 py-2 has-[>svg]:px-3',
                sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
                lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
                icon: 'size-9 rounded-md',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';

        return (
            <Comp
                ref={ref}
                data-slot="button"
                className={cn(buttonVariants({ variant, size, className }))}
                {...props}
            />
        );
    },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
