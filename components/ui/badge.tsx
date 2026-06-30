import * as React from "react";

import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-[3px] border border-[var(--border)] px-2 py-0.5 text-[11px] leading-4 text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
