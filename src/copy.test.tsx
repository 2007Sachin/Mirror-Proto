// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { scan, scanHtml, walkData } from './copyScan'
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
