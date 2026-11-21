import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import './folderCard.css'

type Props = {
  /** Which of the five tints (any number; it wraps). */
  tint?: number
  /** Small mono label and the large title on the folder picture. Drawn by CSS from attributes, so the words are not repeated in the page. */
  label: string
  title: string
  /** The heading under the picture. */
  name: string
  pill?: string
  summary?: string
  /** Short "+" lines. */
  lines?: string[]
  /** Smaller folder, for dense lists. */
  compact?: boolean
  /** With onOpen the whole card is one button that ends in "action →". Without it the card is an article and `footer` holds its own buttons. */
  onOpen?: () => void
  action?: string
  footer?: ReactNode
  current?: boolean
  headingId?: string
  /** Heading level of `name` in article mode, so it can sit under a section heading. */
  level?: 'h2' | 'h3'
  children?: ReactNode
}

/** A tinted card with a folder picture, a mono pill, a heading, "+" lines and an Open footer. The look is in folderCard.css. */
export default function FolderCard({ tint = 0, label, title, name, pill, summary, lines, compact, onOpen, action = 'Open', footer, current, headingId, level: Heading = 'h2', children }: Props) {
  const cls = `fc fc--${tint % 5}${compact ? ' fc--compact' : ''}`
  const body = (
    <>
      <span className="fc-folder" data-label={label} data-title={title} aria-hidden="true"><i className="fc-tab" /></span>
      {pill && <span className="fc-pill">{pill}</span>}
      {onOpen ? <span className="fc-name">{name}</span> : <Heading id={headingId} className="fc-name">{name}</Heading>}
      {summary && <span className="fc-summary">{summary}</span>}
      {lines && lines.length > 0 && <span className="fc-plus">{lines.map(l => <span key={l}>{l}</span>)}</span>}
      {children}
    </>
  )
  if (onOpen) {
    return (
      <button type="button" className={cls} onClick={onOpen} aria-current={current || undefined}>
        {body}
        <span className="fc-foot"><b>{action}</b><ArrowRight size={18} aria-hidden="true" /></span>
      </button>
    )
  }
  return <article className={cls} aria-labelledby={headingId}>{body}{footer && <div className="fc-foot">{footer}</div>}</article>
}
