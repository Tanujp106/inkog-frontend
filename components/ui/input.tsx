import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[4px] border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
