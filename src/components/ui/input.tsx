import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15 placeholder:text-neutral-400",
        className,
      )}
      {...props}
    />
  );
}