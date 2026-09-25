import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-amber-500/40 bg-slate-950/75 px-3 py-1 text-base text-foreground shadow-sm transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/80 hover:border-primary hover:bg-slate-950/90 hover:shadow-[0_0_8px_rgba(245,158,11,0.2)] focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-black focus-visible:shadow-[0_0_12px_rgba(245,158,11,0.3)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          type === "number" && "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
