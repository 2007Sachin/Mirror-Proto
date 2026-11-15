import { useState } from 'react'

// Each note quotes one marked line; hovering a note lights up its line.
const NOTES = [
  { label: 'Clear', line: 0, text: 'You said the problem before the fix.' },
  { label: 'Clear', line: 2, text: 'Your part was easy to find.' },
  { label: 'Circled', line: 1, text: 'The team came before your part.' },
] as const

export default function Notes() {
  const [hot, setHot] = useState<number | null>(null)
  const mark = (i: number, tone: 'clear' | 'circled', text: string) => (
    <mark className={`ml-mark ml-mark--${tone}${hot === i ? ' is-hot' : ''}`}>{text}</mark>
  )

  return (
    <div className="ml-glass ml-notes">
      <p className="ml-said">
        {mark(0, 'clear', 'We rebuilt the checkout flow because drop-offs were high.')} So, um,{' '}
        {mark(1, 'circled', 'it was a group project and we basically all worked on different parts')}, and then{' '}
        {mark(2, 'clear', 'I owned the payment step.')}
      </p>
      <ul className="ml-note-list" role="list">
        {NOTES.map(note => (
          <li
            key={note.text}
            className="ml-note"
            onMouseEnter={() => setHot(note.line)}
            onMouseLeave={() => setHot(null)}
          >
            <span className={`ml-note-label ml-note-label--${note.label === 'Clear' ? 'clear' : 'circled'}`}>{note.label}</span>
            <p>{note.text}</p>
          </li>
        ))}
        <li className="ml-note">
          <span className="ml-note-label">Try next time</span>
          <p>Open with “I owned the payment step,” then add the context.</p>
        </li>
      </ul>
      <p className="ml-note-foot">Example notes</p>
    </div>
  )
}
