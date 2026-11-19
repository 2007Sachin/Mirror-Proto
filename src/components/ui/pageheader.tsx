import React from 'react'

/** Shared PageHeader component using design tokens.
 * - One h1 per page (as required)
 * - Page title with eyebrow/kicker
 * - Breadcrumbs optional
 * - 44px tap targets for navigation
 */
export interface PageHeaderProps {
  /** Page main title */
  title: string
  /** Page subtitle/eyebrow text */
  subtitle?: string
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>
  /** Whether to show the divider line */
  showDivider?: boolean
  /** Additional className */
  className?: string
}

/** PageHeader - a shared component using design tokens.
 * - One h1 per page
 * - Page title with optional subtitle
 * - Breadcrumb support
 * - Proper spacing and typography using design tokens
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  showDivider = true,
  className
}: PageHeaderProps) {
  const breadcrumbElements = breadcrumbs?.map(
    (item, index) =>
      <span key={index} className="page-header__breadcrumb">
        {item.label}{item.href ? ` <a href={item.href} className="page-header__link">→</a>` : ''}
      </span>
  ) ?? []

  return (
    <header className={['page-header', className].filter(Boolean).join(' ')}>
      {showDivider && <hr className="page-header__divider" />}
      <h1 className="page-header__title">{title}</h1>
      {subtitle && (
        <p className="page-header__subtitle">{subtitle}</p>
      )}
      {breadcrumbElements.length > 0 && (
        <div className="page-header__breadcrumbs">{breadcrumbElements}</div>
      )}
    </header>
  )
}
