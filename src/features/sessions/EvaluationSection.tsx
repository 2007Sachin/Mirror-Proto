import './evaluation.css'
import type { EvidenceItem, Reflection } from '../../lib/api'
import { DIMENSION, evaluationOf, LEVEL, type Level } from './evaluation'

function summary(items: EvidenceItem[]): string | null {
  const ranked = [...items].sort((a, b) => LEVEL[b.level as Level].rank - LEVEL[a.level as Level].rank)
  const top = ranked[0], low = ranked[ranked.length - 1]
  if (!top || !low || LEVEL[top.level as Level].rank === LEVEL[low.level as Level].rank) return null
  return `Your clearest answer was on ${DIMENSION[top.competency].label.toLowerCase()}. The one to work on next is ${DIMENSION[low.competency].label.toLowerCase()}.`
}

/**
 * Your evaluation: for each thing an answer can show, a level in words, the line you said that shows it, and one thing to try.
 * Never a number. Without an evaluation yet, offers to add one.
 */
export default function EvaluationSection({ reflection, busy, failed, onAdd }: { reflection: Reflection | null; busy: boolean; failed: boolean; onAdd: () => void }) {
  if (!reflection) return null
  const items = evaluationOf(reflection)
  const line = summary(items)
  return (
    <section aria-labelledby="sess-eval" className="ev">
      <h2 id="sess-eval">Your evaluation</h2>
      {items.length === 0 ? (
        <>
          <p className="m-quiet">There is no evaluation on these notes yet. It reads your answers on structure, specificity, ownership and result, in plain levels.</p>
          {failed && <p role="status">That did not go through. Your notes are safe. Try again.</p>}
          <button type="button" className="m-btn" disabled={busy} onClick={onAdd}>{busy ? 'Reading your answers…' : failed ? 'Try again' : 'Add the evaluation'}</button>
        </>
      ) : (
        <>
          <p className="m-quiet">How your answers read on four things. Levels are words, not numbers, and each points to something you said.</p>
          {line && <p className="ev-line">{line}</p>}
          <ul className="ev-list">
            {items.map(item => {
              const level = item.level as Level
              return (
                <li key={item.competency} className={`ev-item ev-item--${level}`}>
                  <div className="ev-head">
                    <h3>{DIMENSION[item.competency].label}</h3>
                    <span className="ev-level">{LEVEL[level].word}</span>
                  </div>
                  <p className="ev-means">{DIMENSION[item.competency].means}</p>
                  <blockquote className="ev-quote"><span>You said</span>“{item.quote}”</blockquote>
                  {item.observation && <p>{item.observation}</p>}
                  {item.fix && <p className="ev-try"><strong>Try this.</strong> {item.fix.replace(/^Try\s+/i, '').replace(/^./, c => c.toUpperCase())}</p>}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
