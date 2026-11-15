// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { scanHtml } from './copyScan'
import Interview, { type InterviewProps } from './pages/Interview'
import ScreenDebrief from './features/screen/ScreenDebrief'
import { ScreenEntryCard } from './features/screen/ScreenEntryCard'

window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList

const noop = () => {}
const voice = {
  voiceState: 'inactive', orbState: 'idle', partialTranscript: '', finalTranscript: '', questionText: '', error: null,
  inputLevel: 0, outputLevel: 0, isMuted: false, active: false,
  start: async () => false, stop: noop, retry: noop, interrupt: noop, mute: noop, continueByTyping: noop, commitSpokenAnswer: noop,
} as unknown as InterviewProps['voice']
const interviewProps = (extra: Partial<InterviewProps> = {}): InterviewProps => ({
  question: 'Can you tell me about your background and why this role?', questionIndex: 0, totalDots: 6, isLast: false, focusLabel: 'Ownership',
  answers: [], orb: 'idle', voice, flowText: null, canRetry: false, waiting: false, busy: false, answer: '', setAnswer: noop,
  sessionId: 's1', onSubmit: noop, onRetry: noop, onContinueLater: noop, onEnd: noop, onSwitchToType: noop, onSwitchToSpeak: noop, ...extra,
})

const turns = [
  { question: 'Q1?', answer: 'Last year our team had a slow weekly report. I led the rebuild in Tableau. The report now loads in 4 seconds, down from 40.' },
  { question: 'Q2?', answer: 'Um, I worked on various things and, you know, helped with stuff.' },
]

describe('copy: screening call', () => {
  const room = renderToStaticMarkup(<Interview {...interviewProps({ screen: { remainingSeconds: 5 * 60, totalSeconds: 8 * 60, onEnd: noop } })} />)

  it('the room passes the copy scan', () => {
    expect(scanHtml('screen:room', room)).toEqual([])
    expect(scanHtml('screen:room last', renderToStaticMarkup(<Interview {...interviewProps({ isLast: true, screen: { remainingSeconds: 50, totalSeconds: 480, onEnd: noop } })} />))).toEqual([])
  })
  it('the room has no hints, tips, coverage, captions, counts or Continue later', () => {
    expect(room).toContain('Five minutes left.')
    expect(room).toContain('About 5 minutes left.')
    expect(room).toContain('End the call')
    for (const gone of ['Tips', 'Captions', 'Continue later', 'Question 1', 'what happened, what you did', 'Pace', 'Gentle guidance', 'iv-dots', 'Finish']) expect(room).not.toContain(gone)
  })
  it('the practice room is unchanged without the screen prop', () => {
    const practice = renderToStaticMarkup(<Interview {...interviewProps()} />)
    for (const there of ['Chat and tips', 'Captions', 'Continue later', 'Question 1']) expect(practice).toContain(there)
  })
  it('the debrief passes the scan and shows only the learner own words', () => {
    const html = renderToStaticMarkup(<ScreenDebrief turns={turns} skills={[]} onReplay={noop} onDone={noop} />)
    expect(scanHtml('screen:debrief', html)).toEqual([])
    expect(html).toContain('What automated screeners listen for')
    expect(html).toContain('Replay this answer')
    expect(html).toContain('Nothing in your answers showed this yet')
    expect(html).not.toMatch(/passed|failed|score/i)
    expect(html).not.toContain('This call used up to')
  })
  it('the debrief hides Replay without a handler and notes the short fallback call', () => {
    const html = renderToStaticMarkup(<ScreenDebrief turns={turns} skills={[]} cappedAtFour onDone={noop} />)
    expect(html).not.toContain('Replay this answer')
    expect(html).toContain('This call used up to four questions.')
    expect(scanHtml('screen:debrief capped', html)).toEqual([])
  })
  it('the entry card passes the scan in each state', () => {
    for (const target of [null, { id: 't', role: 'Analyst', company: 'Acme', skillCount: 0 }, { id: 't', role: 'Analyst', company: 'Acme', skillCount: 5 }]) {
      expect(scanHtml('screen:entry', renderToStaticMarkup(<ScreenEntryCard target={target} onStart={noop} />))).toEqual([])
    }
    expect(renderToStaticMarkup(<ScreenEntryCard target={null} onStart={noop} />)).toContain('disabled')
  })
})
