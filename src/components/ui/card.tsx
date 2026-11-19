import React from 'react'

/** Shared Card component using design tokens.
 * - var(--radius-3, 12px) border radius
 * - 1px solid var(--m-line) border
 * - var(--m-card) background
 * - Padding via var(--space-4, 16px) var(--space-18, 18px)
 * - Visible focus-visible outline
 */
export interface CardProps {
  /** Card title */
  title?: string
  /** Card subtitle/heading */
  subtitle?: string
  /** Children content */
  children: React.ReactNode
  /** Whether the card has a border */
  bordered?: boolean
  /** Whether the card is elevated (shadow) */
  elevated?: boolean
  /** Additional className */
  className?: string
}

/** Card - a shared component using design tokens.
 * - Border radius: var(--radius-3, 12px)
 * - Border: 1px solid var(--m-line)
 * - Background: var(--m-card)
 * - Padding: 16px 18px
 * - Shadow: var(--shadow-3) when elevated
 * - Focus-visible outline
 */
export function Card({
  title,
  subtitle,
  children,
  bordered = true,
  elevated = false,
  className
}: CardProps) {
  const cardClasses = ['card', bordered && 'card--bordered', elevated && 'card--elevated', className].filter(
    Boolean
  ).join(' ')

  return (
    <div className={cardClasses}>
      {title || subtitle && (
        <div className="card__header">
          {title && <h3 className="card__title">{title}</h3>}
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="card__content">{children}</div>
    </div>
  )
}
