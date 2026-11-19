import React from 'react'

/** Shared Button component using design tokens.
 * - 44px tap target min-height
 * - Visible focus-visible outline
 * - Supports primary (accent) and secondary (quiet) variants
 * - Disabled state
 */
export interface ButtonProps {
  /** Primary filled action */
  asPrimary?: boolean
  /** Quiet outlined button */
  asQuiet?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Button text */
  children: React.ReactNode
  /** On click handler */
  onClick?: () => void
  /** Additional className */
  className?: string
  /** Optional type attribute for form submission */
  type?: 'button' | 'submit' | 'reset'
}

/** Button - a shared component using design tokens.
 * - 44px tap target min-height
 * - Visible focus-visible outline
 * - Primary: accent background with white ink
 * - Secondary: quiet with ink color
 * - Disabled: opacity reduced
 */
export function Button({
  asPrimary,
  asQuiet,
  disabled,
  children,
  onClick,
  className,
  type = 'button'
}: ButtonProps) {
  const classes = ['button']
  if (disabled) classes.push('button--disabled')
  if (asPrimary) classes.push('button--primary')
  if (asQuiet) classes.push('button--quiet')
  if (className) classes.push(className)

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes.join(' ')}
    >
      {children}
    </button>
  )
}
