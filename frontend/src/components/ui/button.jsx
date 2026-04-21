import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const variants = cva(
  "inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-white text-slate-900 hover:bg-slate-100",
        primary: "border-brand bg-brand text-white hover:bg-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Button({ className, variant, ...props }) {
  return <button className={cn(variants({ variant }), className)} {...props} />;
}
