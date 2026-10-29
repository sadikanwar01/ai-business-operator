import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/format'

const controlBase =
  'w-full bg-surface-2 border border-line-strong rounded-[9px] text-[13.5px] text-ink placeholder:text-ink-4 ' +
  'transition-colors duration-150 hover:border-ink-4 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/15 ' +
  'disabled:opacity-50'

export function Field({
  label,
  hint,
  children,
  className,
  required,
}: {
  label?: string
  hint?: string
  children: ReactNode
  className?: string
  required?: boolean
}) {
  return (
    <label className={cn('block', className)}>
      {label ? (
        <span className="mb-2 flex items-center gap-1 text-[12.5px] font-medium text-ink-2">
          {label}
          {required ? <span className="text-accent">*</span> : null}
        </span>
      ) : null}
      {children}
      {hint ? <span className="mt-1.5 block text-[11.5px] leading-relaxed text-ink-4">{hint}</span> : null}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(controlBase, 'h-9.5 px-3', className)} {...rest} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(controlBase, 'resize-none px-3.5 py-3 leading-relaxed', className)}
        {...rest}
      />
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          controlBase,
          'h-9.5 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236a7286\' stroke-width=\'2.5\' stroke-linecap=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    )
  },
)
