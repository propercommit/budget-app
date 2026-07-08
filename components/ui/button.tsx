import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button System ("Elevate"): one primary color, semantic red, one radius
 * language. Colored shadows come from --shadow-btn-* tokens in globals.css so
 * they track the theme's accent.
 *
 * Variant semantics:
 * - `default` — the one confident primary action per view (Add, Save, Create)
 * - `secondary` — the calm partner (Cancel, dismiss, Close)
 * - `outline` — bordered low-emphasis actions (Manage, Account)
 * - `ghost` / `ghost-primary` — quiet in-flow taps (Today / View all)
 * - `destructive-outline` — arms a delete; `destructive` — confirms it
 * - `add` — the unified inline "create" affordance (Add Entry, Add income
 *   source, + Category): calmer than a primary, unmistakably an action
 *
 * Icon buttons are always circular: pair any variant with an `icon*` size.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-btn-primary)] hover:bg-primary-hover hover:shadow-[var(--shadow-btn-primary-hover)] active:bg-primary-active active:shadow-[var(--shadow-btn-primary-active)]",
        secondary:
          "bg-muted text-foreground shadow-[var(--shadow-btn-secondary)] hover:bg-input",
        outline:
          "border border-border bg-card text-foreground shadow-[var(--shadow-btn-secondary)] hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        "ghost-primary": "text-primary hover:bg-primary/10",
        destructive:
          "bg-destructive text-white shadow-[var(--shadow-btn-destructive)] hover:bg-destructive-hover hover:shadow-[var(--shadow-btn-destructive-hover)] focus-visible:ring-destructive/30",
        "destructive-outline":
          "border border-destructive/50 bg-transparent text-destructive hover:bg-destructive/5 hover:border-destructive focus-visible:ring-destructive/30",
        add: "border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/45",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 rounded-[10px] gap-1.5 px-4 text-[13px] has-[>svg]:px-3",
        default: "h-11 rounded-xl px-5 text-[15px] has-[>svg]:px-4",
        lg: "h-[52px] rounded-[14px] px-7 text-base has-[>svg]:px-6",
        icon: "size-10 rounded-full active:scale-[0.92]",
        "icon-sm": "size-8 rounded-full active:scale-[0.92]",
        "icon-lg": "size-11 rounded-full active:scale-[0.92]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
