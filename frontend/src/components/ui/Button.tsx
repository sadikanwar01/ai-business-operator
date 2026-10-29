import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white font-semibold hover:bg-accent-hover active:bg-accent-dim disabled:bg-accent/40',
  secondary:
    'bg-surface-3 text-ink border border-line-strong hover:border-ink-4 hover:bg-surface-2 disabled:opacity-50',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2 disabled:opacity-50',
  quiet: 'text-ink-3 hover:text-ink-2 hover:bg-surface-2 disabled:opacity-50',
  danger:
    'bg-critical-soft text-critical border border-critical/30 hover:bg-critical/20 disabled:opacity-50',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-[7px]',
  md: 'h-9.5 px-4 text-[13.5px] gap-2 rounded-[9px]',
  lg: 'h-11 px-5 text-[14.5px] gap-2 rounded-[10px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-colors duration-150',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
})
