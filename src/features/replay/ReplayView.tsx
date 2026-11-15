import { analyseAnswer } from '../../lib/analyse'
import { compareAttempts, fillerLine, highlightSegments, missingStarParts } from './replayLogic'
import './replay.css'

const LABEL = { filler: 'Filler word', vague: 'Vague phrase' } as const

/** The learner's own text with filler words and vague phrases marked (underline style plus a label, never colour alone). */
export function HighlightedAnswer({ text }: { text: string }) {
  const segs = highlightSegments(text, analyseAnswer(text))
  return (
    <p className="rp-text">
      {segs.map((s, i) => s.kind === 'plain'
        ? <span key={i}>{s.text}</span>
        : <mark key={i} className={`rp-mark rp-mark--${s.kind}`} title={LABEL[s.kind]}><span className="rp-sr">{LABEL[s.kind]}: </span>{s.text}</mark>)}
    </p>
  )
}

export function Legend() {
  return (
    <p className="rp-legend">
      <mark className="rp-mark rp-mark--filler">Filler word</mark> <mark className="rp-mark rp-mark--vague">Vague phrase</mark>
    </p>
  )
}

/** Fillers as transcribed, plus the STAR parts not shown yet. */
export function Findings({ text }: { text: string }) {
  const a = analyseAnswer(text)
  const missing = missingStarParts(a)
  return (
    <div className="rp-find">
      <p>{a.fillerTotal ? <>Filler words, as transcribed: <strong>{fillerLine(a)}</strong></> : 'No filler words found in what was transcribed.'}</p>
      {missing.length === 0
        ? <p>Your answer touches what happened, what you did and what changed.</p>
        : (
          <>
            <p>Not shown yet:</p>
            <ul>{missing.map(m => <li key={m.key}><strong>{m.name}</strong>. {m.tip}</li>)}</ul>
          </>
        )}
    </div>
  )
}

/** Attempts side by side (stacked on narrow screens). Shows the first and the latest, with what improved under them. */
export function CompareView({ attempts }: { attempts: string[] }) {
  if (attempts.length < 2) return null
  const first = attempts[0]
  const last = attempts[attempts.length - 1]
  const cmp = compareAttempts(analyseAnswer(first), analyseAnswer(last))
  return (
    <div className="rp-compare">
      <div className="rp-cols">
        <section aria-label="First try"><h4>First try</h4><HighlightedAnswer text={first} /></section>
        <section aria-label="Latest try"><h4>{attempts.length === 2 ? 'Second try' : `Try ${attempts.length}`}</h4><HighlightedAnswer text={last} /></section>
      </div>
      <Legend />
      <div className="rp-improved" aria-live="polite">
        <h4>What improved</h4>
        <ul>{cmp.lines.map(l => <li key={l}>{l}</li>)}</ul>
      </div>
    </div>
  )
}
