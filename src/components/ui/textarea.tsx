import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-amber-500/40 bg-slate-950/75 px-3 py-2 text-base text-foreground shadow-sm transition-all duration-150 placeholder:text-muted-foreground/80 hover:border-primary hover:bg-slate-950/90 hover:shadow-[0_0_8px_rgba(245,158,11,0.2)] focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-black focus-visible:shadow-[0_0_12px_rgba(245,158,11,0.3)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
