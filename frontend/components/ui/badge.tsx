import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: "bg-amber-600 text-white hover:bg-amber-700",
    secondary: "bg-zinc-700 text-zinc-200 hover:bg-zinc-600",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-zinc-700 text-zinc-200 hover:bg-zinc-800",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
