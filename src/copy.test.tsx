// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { allowlist } from './copyAllowlist'
import { BANNED, scan, scanHtml, walkData } from './copyScan'
import { newUser, rich } from './pages/todayFixtures'
import type { TodayData } from './features/today/types'
import Landing from './pages/Landing'
import FirstInterview from './pages/FirstInterview'
import Overview from './pages/Overview'
import Interview, { type InterviewProps } from './pages/Interview'
import Practice from './pages/Practice'
import JourneyMap from './practice/sql/journey/JourneyMap'
import { sampleState } from './practice/sql/journey/sampleState'
import { buildJourney } from './practice/sql/journey/journeyLogic'
import { problems as sqlProblems } from './practice/sql/problems'
import { concepts } from './practice/sql/concepts/data'
import { DIAG, GROUPS } from './practice/sql/plan/diagnostic'
import { interviews as planNotes, sceneName } from './practice/sql/plan/notes'
import { prereqs } from './practice/sql/plan/prereqs'
import { levels, modules } from './practice/sql/curriculum'
import { cases } from './practice/case/data'
import { problems as pyProblems } from './practice/python/problems'
import { items as statsItems } from './practice/stats/items'

const todayHook = vi.hoisted(() => ({ data: null as unknown as TodayData }))
vi.mock('./features/today/useTodayData', () => ({ useTodayData: () => todayHook.data }))

// jsdom has no matchMedia; the screens only read it.
window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList

const noop = () => {}
const voice = {
  voiceState: 'inactive', orbState: 'idle', partialTranscript: '', finalTranscript: '', questionText: '', error: null,
  inputLevel: 0, outputLevel: 0, isMuted: false, active: false,
  start: async () => false, stop: noop, retry: noop, interrupt: noop, mute: noop, continueByTyping: noop, commitSpokenAnswer: noop,
} as unknown as InterviewProps['voice']
const interviewProps = (extra: Partial<InterviewProps> = {}): InterviewProps => ({
  question: 'Tell me about a project you are proud of.', questionIndex: 0, totalDots: 4, isLast: false, focusLabel: 'Ownership',
  answers: [], orb: 'idle', voice, flowText: null, canRetry: false, waiting: false, busy: false, answer: '', setAnswer: noop,
  sessionId: 's1', onSubmit: noop, onRetry: noop, onContinueLater: noop, onEnd: noop, onSwitchToType: noop, onSwitchToSpeak: noop, ...extra,
})

describe('copy: no banned words, fixed counts or percentages', () => {
  it('scanner catches planted strings', () => {
    expect(scan('x', 'Your evidence is ready')).toHaveLength(1)
    expect(scan('x', 'A Reflection and an evaluation')).toHaveLength(1)
    expect(scan('x', 'agentic')).toHaveLength(1)
    expect(scan('x', 'Answer 4 questions')).toHaveLength(1)
    expect(scan('x', 'Step 2 of 4')).toHaveLength(1)
    expect(scan('x', 'a three-question round')).toHaveLength(1)
    expect(scan('x', 'Signups fell 12%')).toHaveLength(1)
    expect(scan('x', 'what percent')).toHaveLength(1)
    expect(scan('x', 'Start speaking now')).toHaveLength(1)
    expect(scan('x', 'Your score is hidden')).toHaveLength(1)
    expect(scan('x', 'a five day streak')).toHaveLength(1)
    expect(scan('x', 'Tell me about a project.')).toHaveLength(0)
    expect(scanHtml('x', '<button aria-label="Reflection"></button>')).toHaveLength(1)
    expect(walkData('d', { prompt: 'fine', nested: [{ hint: 'find the evidence' }], solution: 'SELECT 5%' })).toHaveLength(1)
  })

  const screens: [string, () => React.ReactElement][] = [
    ['Landing', () => <Landing onTry={noop} />],
    ['FirstInterview', () => <FirstInterview onDone={noop} onBack={noop} />],
    ['Overview', () => <Overview profile={null} busy={false} onStart={noop} onContinue={noop} onLetGo={async () => {}} onOpenItem={noop} />],
    ['Interview', () => <Interview {...interviewProps()} />],
    ['Interview last question', () => <Interview {...interviewProps({ isLast: true, answer: 'My answer' })} />],
    ['Practice', () => <Practice />],
    ['SQL journey', () => <JourneyMap state={sampleState} onOpenNode={noop} onContinue={noop} />],
  ]
  for (const [name, render] of screens) {
    it(`screen: ${name}`, () => {
      expect(scanHtml(`screen:${name}`, renderToStaticMarkup(render()))).toEqual([])
    })
  }

  it('journey strings from buildJourney', () => {
    const j = buildJourney({ modules, problems: sqlProblems, concepts, items: [], days: [], todayISO: '2026-01-02', placementDone: false })
    expect(walkData('journey', j)).toEqual([])
    expect(walkData('journey sample', sampleState)).toEqual([])
  })

  const data: [string, unknown][] = [
    ['sql problems', sqlProblems],
    ['concepts', concepts],
    ['plan diagnostic', [DIAG, GROUPS]],
    ['plan notes', [planNotes, sceneName, prereqs]],
    ['curriculum', [levels, modules]],
    ['case data', cases],
    ['python problems', pyProblems],
    ['stats items', statsItems],
  ]
  for (const [name, d] of data) {
    it(`data: ${name}`, () => { expect(walkData(`data:${name}`, d)).toEqual([]) })
  }
})

// Today and Practice "Your record": the house rules that only apply there (no streaks, no "x of y"), on top of the shared BANNED list.
const TODAY_ONLY: [string, RegExp][] = [
  ['streak', /\bstreaks?\b|\bin a row\b/i],
  ['fraction', /\b\d+\s*(of|\/)\s*\d+\b/],
]
// Rendered text plus aria-label, title, placeholder and alt. SQL task data is not rendered on Today; no allowlist is needed here.
function scanToday(where: string, html: string): string[] {
  const root = document.createElement('div')
  root.innerHTML = html
  const texts = [root.textContent ?? '']
  root.querySelectorAll('[aria-label],[placeholder],[title],[alt]').forEach(el => { for (const a of ['aria-label', 'placeholder', 'title', 'alt']) { const v = el.getAttribute(a); if (v) texts.push(v) } })
  return texts.flatMap(t => [...BANNED, ...TODAY_ONLY].flatMap(([name, re]) => { const m = re.exec(t); return m && !allowlist.some(e => e.where.test(where) && e.pattern.test(m[0])) ? [`${where} [${name}] "${m[0]}" in: ${t.slice(0, 90)}`] : [] }))
}
const noop2 = () => {}
const todayProps = { busy: false, onStart: noop2, onContinue: noop2, onLetGo: noop2, onScreen: noop2, onOpenStories: noop2, onReplay: noop2, onOpenItem: noop2, onOpenTarget: noop2, onAddTarget: noop2, onFirstInterview: noop2, onOpenReplays: noop2, onSayItAgain: noop2 }
async function renderTodayHtml(d: TodayData) {
  todayHook.data = d
  const { default: Today } = await import(/* @vite-ignore */ ['./pages/', 'Today'].join('')) // needs C; imported here so the other copy tests do not depend on it
  return renderToStaticMarkup(<Today {...todayProps} />)
}

describe('copy: Today with data (needs B and C)', () => {
  it('passes the scan with a rich fixture (target, matches, history, stories, retries, coach note)', async () => {
    expect(scanToday('today:rich', await renderTodayHtml(rich))).toEqual([])
  })
  it('passes the scan for a new user', async () => {
    expect(scanToday('today:new', await renderTodayHtml(newUser))).toEqual([])
  })
  it('the extra rules catch planted strings', () => {
    expect(scanToday('x', '<p>A 5 day streak</p>')).not.toHaveLength(0)
    expect(scanToday('x', '<p>Three days in a row</p>')).not.toHaveLength(0)
    expect(scanToday('x', '<p>4 of 9 topics</p>')).not.toHaveLength(0)
    expect(scanToday('x', '<p>3/5 done</p>')).not.toHaveLength(0)
    expect(scanToday('x', '<p>Days you practised recently. Gaps are fine.</p>')).toHaveLength(0)
  })
  it('no quote in labels: profile.focus never reaches the page', async () => {
    const focus = 'Going deeper on “Under CMVR rules…”'
    for (const base of [rich, newUser]) {
      const html = await renderTodayHtml({ ...base, input: { ...base.input, profile: { ...base.input.profile!, focus } } })
      expect(html).not.toMatch(/CMVR/)
    }
  })
  it('Practice screen (with "Your record") passes the Today rules', () => {
    expect(scanToday('practice', renderToStaticMarkup(<Practice />))).toEqual([])
  })
})
