import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate ",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs shadow-[0_0_12px_rgba(255,102,0,0.3)]",
        secondary:
          "border-white/[0.10] bg-white/[0.06] backdrop-blur-sm text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
        outline:
          "text-foreground border border-white/[0.15] bg-white/[0.05] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
