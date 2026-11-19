import React from 'react'

/** Shared Chip component using design tokens.
 * - Pill-shaped with var(--radius-full, 999px)
 * - Small text with var(--radius-1, 4px) for inputs/chips
 * - Supports variant props (filled, outlined, close)
 */
export interface ChipProps {
  /** Chip label text */
  children: React.ReactNode
  /** Whether the chip is filled/selected */
  variant?: 'filled' | 'outlined' | 'close'
  /** Chip size - 'small' uses var(--radius-1), others use var(--radius-full) */
  size?: 'small' | 'medium'
  /** On click handler */
  onClick?: () => void
  /** Additional className */
  className?: string
}

/** Chip - a shared component using design tokens.
 * - Filled: var(--color-accent) background with var(--color-accent-ink) text
 * - Outlined: var(--color-accent) border with var(--color-accent) text
 * - Close: small cross/close button
 * - Small size: var(--radius-1, 4px) for inputs/chips
 * - Medium size: var(--radius-full, 999px) pill shape
 */
export function Chip({
  children,
  variant = 'filled',
  size = 'medium',
  onClick,
  className
}: ChipProps) {
  const sizeClass = size === 'small' ? 'chip--small' : ''

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      className={['chip', sizeClass, `chip--${variant}`, className].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  )
}
