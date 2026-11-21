import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import './interviewPrep.css'
import FolderCard from '../components/FolderCard'
import { PREP_ROLES, firstSentence, type PrepRole } from '../prep/roles'

// Which questions you have already been asked live is kept in this browser only (cleared on sign-out with every other mirror.* key).
const KEY = (slug: string) => `mirror.prep.v1.${slug}`
const LAST = 'mirror.prep.v1.last'
const load = (slug: string): string[] => {
  try { const s = JSON.parse(localStorage.getItem(KEY(slug)) ?? 'null'); if (s && Array.isArray(s.done)) return s.done } catch { /* unreadable: start fresh */ }
  return []
}
const keep = (slug: string, done: string[]) => { try { localStorage.setItem(KEY(slug), JSON.stringify({ done })) } catch { /* private mode: lasts for this visit */ } }
const lastRole = () => { try { const slug = localStorage.getItem(LAST); return PREP_ROLES.find(r => r.slug === slug) ?? null } catch { return null } }

type Start = (role: string, openingQuestion: string, speak: boolean) => void

/** Pick a role, then enter a live mock interview for any round. The interviewer opens with a question from that round and follows up from what you say. */
export default function InterviewPrep({ onStart }: { onStart: Start }) {
  const [role, setRole] = useState<PrepRole | null>(lastRole)
  const open = (r: PrepRole | null) => { setRole(r); try { if (r) localStorage.setItem(LAST, r.slug); else localStorage.removeItem(LAST) } catch { /* ignore */ } }
  return (
    <section className="prep-page" aria-label="Interview Prep">
      {role ? <RoleView key={role.slug} role={role} onChange={() => open(null)} onStart={onStart} /> : <Picker onPick={open} />}
    </section>
  )
}

function Picker({ onPick }: { onPick: (r: PrepRole) => void }) {
  return (
    <>
      <div className="page-title"><div><p className="eyebrow">Interview Prep</p><h1>Pick the role you are preparing for</h1><p>Every round of the loop is a live mock interview. An interviewer asks, listens and follows up. Nothing is graded.</p></div></div>
      <ul className="prep-grid">
        {PREP_ROLES.map((r, i) => (
          <li key={r.slug}>
            <FolderCard tint={i} label="Interview loop" title={r.title} name={r.title} pill={`${r.rounds.length} rounds`} lines={r.rounds.slice(0, 3).map(x => x.name)} onOpen={() => onPick(r)} />
          </li>
        ))}
      </ul>
    </>
  )
}

function RoleView({ role, onChange, onStart }: { role: PrepRole; onChange: () => void; onStart: Start }) {
  const [done, setDone] = useState<string[]>(() => load(role.slug))
  const count = (ri: number) => done.filter(d => d.startsWith(`${ri}-`)).length
  const begin = (ri: number, speak: boolean) => {
    const round = role.rounds[ri]
    // Open with the first question of this round you have not been asked yet, then start over once all ten are used.
    const qi = Math.max(0, round.questions.findIndex((_, i) => !done.includes(`${ri}-${i}`)))
    const next = qi === 0 && count(ri) >= round.questions.length ? done.filter(d => !d.startsWith(`${ri}-`)) : done
    const marked = [...next, `${ri}-${qi}`]
    setDone(marked); keep(role.slug, marked)
    onStart(`${role.title} · ${round.name}`.slice(0, 120), round.questions[qi], speak)
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">Interview Prep</p>
          <h1>{role.title}</h1>
          <p>{role.rounds.length} rounds. Pick one to start a live mock interview for it.</p>
        </div>
        <button type="button" className="m-btn m-btn--quiet" onClick={onChange}>Change role</button>
      </div>
      <ul className="prep-grid">
        {role.rounds.map((r, ri) => (
          <li key={r.name}>
            <FolderCard
              tint={ri} label={role.title} title={r.name} name={r.name} headingId={`prep-r${ri}`} pill={`Round ${ri + 1}`}
              summary={firstSentence(r.tests)}
              lines={['A live interviewer, spoken or typed', `${r.questions.length} questions, a fresh one each time`, count(ri) ? `${count(ri)} asked so far` : 'Not started yet']}
              footer={
                <>
                  <button type="button" className="prep-go" onClick={() => begin(ri, true)}>Start interview <ArrowRight size={18} aria-hidden="true" /></button>
                  <button type="button" className="prep-alt" onClick={() => begin(ri, false)}>Type instead</button>
                </>
              }
            >
              <details className="prep-list">
                <summary>See the questions</summary>
                <ol>{r.questions.map(q => <li key={q}>{q}</li>)}</ol>
              </details>
            </FolderCard>
          </li>
        ))}
      </ul>
    </>
  )
}
