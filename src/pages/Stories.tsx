import { useCallback, useEffect, useState } from 'react'
import './stories.css'
import { api, type InterviewSession, type InterviewSummary, type Skill, type TargetSummary } from '../lib/api'
import * as data from '../lib/data'
import { draftStory } from '../stories/starLogic'
import { suggestStories, type Suggestion } from '../stories/suggest'
import { MAX_THEMES, THEMES, themeName } from '../stories/themes'
import { openParts, rolesNeedStories, themeMap } from '../stories/bank'

type Editing = { id: string | null; story: data.StoryInput }
const FIELDS = ['situation', 'task', 'action', 'result'] as const
const LABEL = { situation: 'Situation', task: 'Task', action: 'Action', result: 'Result' }
const blankStory = (themes: string[]): data.StoryInput => ({ title: '', themes, situation: '', task: '', action: '', result: '', quote: null, question: null, sourceInterviewId: null, sourceTurnId: null })

/** Stories you can retell, which themes are still open, and which role still needs one. */
export default function Stories({ initialQuestion = null, initialTheme = null, onInitialConsumed }: { initialQuestion?: string | null; initialTheme?: string | null; onInitialConsumed?: () => void }) {
  const [stories, setStories] = useState<data.StoryRow[] | null>(null)
  const [targets, setTargets] = useState<TargetSummary[] | null>(null)
  const [skills, setSkills] = useState<Record<string, Skill[]>>({})
  const [error, setError] = useState('')
  const [question, setQuestion] = useState(initialQuestion ?? '')
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [past, setPast] = useState<{ list: InterviewSummary[]; open: InterviewSession | null; busy: boolean } | null>(null)

  const load = useCallback(async () => {
    try { setStories(await data.stories.list()) } catch { setError('Your stories could not load. Try again in a moment.'); setStories([]) }
  }, [])
  useEffect(() => { queueMicrotask(() => void load()) }, [load])

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const rows = await api.listTargets()
        if (!live) return
        setTargets(rows)
        const next: typeof skills = {}
        await Promise.all(rows.map(async t => {
          try { next[t.id] = (await api.getTarget(t.id)).skills } catch { next[t.id] = [] }
        }))
        if (live) setSkills(next)
      } catch { if (live) setTargets([]) }
    })()
    return () => { live = false }
  }, [stories])

  const suggest = useCallback((q: string, list: data.StoryRow[]) => setSuggestions(q.trim() ? suggestStories(q, list) : null), [])
  useEffect(() => {
    if (initialQuestion && stories) queueMicrotask(() => { setQuestion(initialQuestion); suggest(initialQuestion, stories); onInitialConsumed?.() })
  }, [initialQuestion, stories, suggest, onInitialConsumed])
  useEffect(() => {
    if (initialTheme === null) return
    queueMicrotask(() => { setEditing({ id: null, story: blankStory(initialTheme ? [initialTheme] : []) }); onInitialConsumed?.() })
  }, [initialTheme, onInitialConsumed])

  const list = stories ?? []
  const map = themeMap(list)
  const roles = targets ? rolesNeedStories(targets.map(t => ({ ...t, skills: skills[t.id] ?? [] })), list) : []

  const save = async () => {
    if (!editing || !editing.story.title.trim()) return
    try {
      if (editing.id) await data.stories.update(editing.id, editing.story)
      else await data.stories.create(editing.story)
      setEditing(null)
      await load()
    } catch { setError('That story could not be saved. Try again.') }
  }
  const remove = async (id: string) => {
    try { await data.stories.remove(id); setConfirmId(null); await load() } catch { setError('That story could not be deleted. Try again.') }
  }
  const toggleTheme = (id: string) => setEditing(e => {
    if (!e) return e
    const has = e.story.themes.includes(id)
    const themes = has ? e.story.themes.filter(t => t !== id) : [...e.story.themes, id].slice(0, MAX_THEMES)
    return { ...e, story: { ...e.story, themes } }
  })
  const setField = (k: keyof data.StoryInput, v: string) => setEditing(e => (e ? { ...e, story: { ...e.story, [k]: v } } : e))

  const openPast = async () => {
    setPast({ list: [], open: null, busy: true })
    try {
      const all = await api.listInterviews({ limit: 20 })
      setPast({ list: all.filter(i => i.answered > 0), open: null, busy: false })
    } catch { setPast(null); setError('Your past sessions could not load. Try again.') }
  }
  const openSession = async (id: string) => {
    setPast(p => (p ? { ...p, busy: true } : p))
    try { const s = await api.getInterview(id); setPast(p => (p ? { ...p, open: s, busy: false } : p)) } catch { setError('That session could not load.'); setPast(p => (p ? { ...p, busy: false } : p)) }
  }
  const draftFrom = (s: InterviewSession, turn: InterviewSession['turns'][number]) => {
    const d = draftStory({ question: turn.question, answer: turn.answer })
    setEditing({ id: null, story: { ...d, question: turn.question, sourceInterviewId: s.id, sourceTurnId: turn.id } })
    setPast(null)
  }

  return (
    <div className="workspace-content stories-page">
      <div className="page-title"><div><p className="eyebrow">Stories</p><h1>Stories you can retell</h1><p>Real moments in your own words. A role can use a story when the theme matches what the job asks for.</p></div></div>
      {error && <p className="stories-error" role="alert">{error}</p>}

      <div className="m-split">
        <section className="m-card" aria-labelledby="st-cover">
          <h2 id="st-cover">Themes</h2>
          {map.canTell.length > 0 && (
            <div>
              <p className="m-quiet">You can tell</p>
              <ul className="m-chips">{map.canTell.map(n => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
          {map.missing.length > 0 && (
            <div>
              <p className="m-quiet">Still open</p>
              <ul className="m-chips">{map.missing.map(n => <li key={n} className="is-open">{n}</li>)}</ul>
            </div>
          )}
          {list.length === 0 && <p className="m-quiet">No stories yet. Save one from a past answer and it will show up here.</p>}
        </section>

        <section className="m-card" aria-labelledby="st-roles">
          <h2 id="st-roles">Which role needs a story</h2>
          {targets && targets.length === 0 && <p className="m-quiet">Add a role under Targets and this list will name the story it can use.</p>}
          {targets === null && <p className="m-quiet" role="status">Looking at your roles…</p>}
          <ul className="stories-roles">
            {roles.map(r => (
              <li key={r.id}>
                <strong>{r.role}</strong>
                <span className="m-quiet">{r.company}</span>
                <p>{r.storyTitle ? `A hint: ${r.storyTitle} shares a theme with this role.` : 'No theme matches yet.'}{r.needs ? ` A hint: a story about ${r.needs.toLowerCase()} is still open.` : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="m-card" aria-labelledby="st-suggest">
        <h2 id="st-suggest">Find a story for a question</h2>
        <label htmlFor="st-q">Paste or type a question</label>
        <div className="stories-row">
          <input id="st-q" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') suggest(question, list) }} placeholder="Tell me about a time you worked under a tight deadline" />
          <button type="button" className="m-btn" onClick={() => suggest(question, list)}>Suggest</button>
        </div>
        {suggestions && (suggestions.length === 0
          ? <p className="m-quiet">No saved story fits yet. Save one from a past answer.</p>
          : <ul className="stories-roles">{suggestions.map(({ story, reason }) => <li key={story.id}><strong>{story.title}</strong><span className="m-quiet">{reason}</span></li>)}</ul>)}
      </section>

      <section className="m-card" aria-labelledby="st-past">
        <h2 id="st-past">From a past answer</h2>
        {!past && <button type="button" className="m-btn m-btn--quiet" onClick={() => void openPast()}>Choose a past answer</button>}
        {past && !past.open && (past.busy ? <p role="status">Loading your sessions.</p> : past.list.length === 0 ? <p className="m-quiet">No finished sessions yet.</p> :
          <ul className="stories-roles">{past.list.map(i => <li key={i.id}><button type="button" className="m-btn m-btn--quiet" onClick={() => void openSession(i.id)}>{i.role}, {new Date(i.createdAt).toLocaleDateString()}</button></li>)}</ul>)}
        {past?.open && <ul className="stories-roles">{past.open.turns.filter(t => t.answer.trim()).map(t => <li key={t.id}><p><strong>{t.question}</strong></p><p className="m-quiet">{t.answer}</p><button type="button" className="m-btn m-btn--quiet" onClick={() => draftFrom(past.open!, t)}>Save as a story</button></li>)}</ul>}
        {past && <button type="button" className="m-link" onClick={() => setPast(null)}>Close</button>}
      </section>

      {editing && (
        <section className="m-card" aria-labelledby="st-edit">
          <h2 id="st-edit">{editing.id ? 'Edit story' : 'New story'}</h2>
          <label htmlFor="st-title">Title</label>
          <input id="st-title" value={editing.story.title} maxLength={200} onChange={e => setField('title', e.target.value)} />
          <fieldset><legend>Themes</legend><div className="stories-chips">{THEMES.map(t => <label key={t.id} className="stories-chip"><input type="checkbox" checked={editing.story.themes.includes(t.id)} onChange={() => toggleTheme(t.id)} />{t.name}</label>)}</div></fieldset>
          {FIELDS.map(k => <div key={k}><label htmlFor={`st-${k}`}>{LABEL[k]}</label><textarea id={`st-${k}`} rows={3} maxLength={2000} value={editing.story[k]} onChange={e => setField(k, e.target.value)} placeholder="Write this part in your own words." /></div>)}
          {editing.story.quote && <blockquote className="stories-quote"><span>From your answer</span>{editing.story.quote}</blockquote>}
          {editing.story.question && <p className="m-quiet">Question: {editing.story.question}</p>}
          <div className="stories-row"><button type="button" className="m-btn" disabled={!editing.story.title.trim()} onClick={() => void save()}>Save</button><button type="button" className="m-btn m-btn--quiet" onClick={() => setEditing(null)}>Cancel</button></div>
        </section>
      )}

      <section className="m-card" aria-labelledby="st-list">
        <h2 id="st-list">Saved stories</h2>
        {stories && list.length === 0 && <p className="m-quiet">No stories yet. Save one from a past answer and it will show up here.</p>}
        <ul className="m-grid-cards">
          {list.map(s => {
            const open = openParts(s)
            return (
              <li key={s.id}>
                <article>
                  <h3>{s.title}</h3>
                  <p className="m-quiet">{s.themes.length ? s.themes.map(themeName).join(', ') : 'No theme chosen'}</p>
                  <p>{open.length ? `${open.join(' and ')} ${open.length === 1 ? 'is' : 'are'} still open.` : 'Situation, task, action and result are all in place.'}</p>
                  <div className="stories-row">
                    <button type="button" className="m-btn m-btn--quiet" onClick={() => setEditing({ id: s.id, story: { title: s.title, themes: s.themes, situation: s.situation, task: s.task, action: s.action, result: s.result, quote: s.quote, question: s.question, sourceInterviewId: s.sourceInterviewId, sourceTurnId: s.sourceTurnId } })}>Edit</button>
                    {confirmId === s.id
                      ? <><span>Delete this story?</span><button type="button" className="m-btn m-btn--quiet" onClick={() => void remove(s.id)}>Yes, delete</button><button type="button" className="m-btn m-btn--quiet" onClick={() => setConfirmId(null)}>Keep it</button></>
                      : <button type="button" className="m-btn m-btn--quiet" onClick={() => setConfirmId(s.id)}>Delete</button>}
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
