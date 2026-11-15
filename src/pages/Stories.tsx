import { useCallback, useEffect, useState } from 'react'
import './stories.css'
import { api, type InterviewSession, type InterviewSummary } from '../lib/api'
import * as data from '../lib/data'
import { draftStory } from '../stories/starLogic'
import { suggestStories, type Suggestion } from '../stories/suggest'
import { MAX_THEMES, THEMES, themeName } from '../stories/themes'

type Editing = { id: string | null; story: data.StoryInput }
const FIELDS = ['situation', 'task', 'action', 'result'] as const
const LABEL = { situation: 'Situation', task: 'Task', action: 'Action', result: 'Result' }
const count = (n: number) => (n === 0 ? 'No story yet' : n === 1 ? '1 story' : `${n} stories`)

export default function Stories({ initialQuestion = null, onInitialConsumed }: { initialQuestion?: string | null; onInitialConsumed?: () => void }) {
  const [stories, setStories] = useState<data.StoryRow[] | null>(null)
  const [error, setError] = useState('')
  const [question, setQuestion] = useState(initialQuestion ?? '')
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [past, setPast] = useState<{ list: InterviewSummary[]; open: InterviewSession | null; busy: boolean } | null>(null)

  const load = useCallback(async () => {
    try { setStories(await data.stories.list()) } catch { setError('Your stories could not load. Try again in a moment.'); setStories([]) }
  }, [])
  useEffect(() => { queueMicrotask(() => void load()) }, [load])

  const suggest = useCallback((q: string, list: data.StoryRow[]) => setSuggestions(q.trim() ? suggestStories(q, list) : null), [])
  useEffect(() => {
    if (initialQuestion && stories) queueMicrotask(() => { setQuestion(initialQuestion); suggest(initialQuestion, stories); onInitialConsumed?.() })
  }, [initialQuestion, stories, suggest, onInitialConsumed])

  const list = stories ?? []
  const shown = filter ? list.filter(s => s.themes.includes(filter)) : list

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
      <div className="page-title"><div><p className="eyebrow">YOUR STORIES</p><h1>Story bank</h1><p>Real moments from your answers, ready to reuse. Everything here is your own wording.</p></div></div>
      {error && <p className="stories-error" role="alert">{error}</p>}

      <section className="stories-card" aria-labelledby="st-suggest">
        <h2 id="st-suggest">Suggest a story</h2>
        <label htmlFor="st-q">Paste or type a question</label>
        <div className="stories-row">
          <input id="st-q" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') suggest(question, list) }} placeholder="Tell me about a time you worked under a tight deadline" />
          <button type="button" className="story-btn" onClick={() => suggest(question, list)}>Suggest</button>
        </div>
        {suggestions && (suggestions.length === 0
          ? <p>No saved story fits yet. Save one from a past answer.</p>
          : <ul className="stories-suggest">{suggestions.map(({ story, reason }) => <li key={story.id}><strong>{story.title}</strong><span>{reason}</span></li>)}</ul>)}
      </section>

      <section className="stories-card" aria-labelledby="st-cover">
        <h2 id="st-cover">Themes you have covered</h2>
        <ul className="stories-cover">{THEMES.map(t => <li key={t.id}><span>{t.name}</span><span>{count(list.filter(s => s.themes.includes(t.id)).length)}</span></li>)}</ul>
      </section>

      <section className="stories-card" aria-labelledby="st-past">
        <h2 id="st-past">From a past answer</h2>
        {!past && <button type="button" className="story-btn" onClick={() => void openPast()}>Choose a past answer</button>}
        {past && !past.open && (past.busy ? <p role="status">Loading your sessions.</p> : past.list.length === 0 ? <p>No finished sessions yet.</p> :
          <ul className="stories-pick">{past.list.map(i => <li key={i.id}><button type="button" className="story-btn" onClick={() => void openSession(i.id)}>{i.role}, {new Date(i.createdAt).toLocaleDateString()}</button></li>)}</ul>)}
        {past?.open && <ul className="stories-pick">{past.open.turns.filter(t => t.answer.trim()).map(t => <li key={t.id}><p><strong>{t.question}</strong></p><p className="stories-answer">{t.answer}</p><button type="button" className="story-btn" onClick={() => draftFrom(past.open!, t)}>Save as a story</button></li>)}</ul>}
        {past && <button type="button" className="story-link" onClick={() => setPast(null)}>Close</button>}
      </section>

      {editing && (
        <section className="stories-card" aria-labelledby="st-edit">
          <h2 id="st-edit">{editing.id ? 'Edit story' : 'New story'}</h2>
          <label htmlFor="st-title">Title</label>
          <input id="st-title" value={editing.story.title} maxLength={200} onChange={e => setField('title', e.target.value)} />
          <fieldset><legend>Themes</legend><div className="stories-chips">{THEMES.map(t => <label key={t.id} className="stories-chip"><input type="checkbox" checked={editing.story.themes.includes(t.id)} onChange={() => toggleTheme(t.id)} />{t.name}</label>)}</div></fieldset>
          {FIELDS.map(k => <div key={k}><label htmlFor={`st-${k}`}>{LABEL[k]}</label><textarea id={`st-${k}`} rows={3} maxLength={2000} value={editing.story[k]} onChange={e => setField(k, e.target.value)} placeholder="Write this part in your own words." /></div>)}
          {editing.story.quote && <blockquote className="stories-quote"><span>From your answer</span>{editing.story.quote}</blockquote>}
          {editing.story.question && <p className="stories-source">Question: {editing.story.question}</p>}
          <div className="stories-row"><button type="button" className="story-btn story-btn--main" disabled={!editing.story.title.trim()} onClick={() => void save()}>Save</button><button type="button" className="story-btn" onClick={() => setEditing(null)}>Cancel</button></div>
        </section>
      )}

      <section className="stories-card" aria-labelledby="st-list">
        <h2 id="st-list">Your stories</h2>
        <label htmlFor="st-filter">Show</label>
        <select id="st-filter" value={filter} onChange={e => setFilter(e.target.value)}><option value="">All themes</option>{THEMES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        {stories && shown.length === 0 && <p>{list.length ? 'No story with that theme yet.' : 'No stories yet. Save one from a past answer and it will show up here.'}</p>}
        <ul className="stories-list">{shown.map(s => (
          <li key={s.id}>
            <h3>{s.title}</h3>
            <p className="stories-tags">{s.themes.length ? s.themes.map(themeName).join(', ') : 'No theme chosen'}</p>
            {FIELDS.map(k => s[k] && <p key={k}><strong>{LABEL[k]}.</strong> {s[k]}</p>)}
            {s.quote && <blockquote className="stories-quote"><span>From your answer</span>{s.quote}</blockquote>}
            {s.question && <p className="stories-source">Question: {s.question}</p>}
            <div className="stories-row">
              <button type="button" className="story-btn" onClick={() => setEditing({ id: s.id, story: { title: s.title, themes: s.themes, situation: s.situation, task: s.task, action: s.action, result: s.result, quote: s.quote, question: s.question, sourceInterviewId: s.sourceInterviewId, sourceTurnId: s.sourceTurnId } })}>Edit</button>
              {confirmId === s.id
                ? <><span>Delete this story?</span><button type="button" className="story-btn" onClick={() => void remove(s.id)}>Yes, delete</button><button type="button" className="story-btn" onClick={() => setConfirmId(null)}>Keep it</button></>
                : <button type="button" className="story-btn" onClick={() => setConfirmId(s.id)}>Delete</button>}
            </div>
          </li>))}</ul>
      </section>
    </div>
  )
}
