import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-electric/30 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-electric text-white shadow-lg shadow-electric/25 hover:bg-electric-600 hover:shadow-electric/40",
        gold: "bg-gold text-navy shadow-lg shadow-gold/20 hover:bg-gold-600",
        outline: "border border-slate-300 bg-white text-slate-800 hover:border-electric hover:text-electric",
        ghost: "text-slate-700 hover:bg-slate-100",
        glass: "border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20",
        danger: "bg-red-600 text-white hover:bg-red-700",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        link: "text-electric underline-offset-4 hover:underline px-0",
      },
      size: { sm: "h-9 px-3.5 text-sm", md: "h-11 px-5 text-[15px]", lg: "h-13 px-7 text-base", icon: "h-10 w-10" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { loading?: boolean }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading, children, disabled, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
    {children}
  </button>
));
Button.displayName = "Button";
