// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scanHtml } from './copyScan'
import ReplayPanel from './features/replay/ReplayPanel'
import { CompareView } from './features/replay/ReplayView'
import SessionAnswers from './features/replay/SessionAnswers'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const stored: unknown[] = []
const add = vi.fn(async (i: Record<string, unknown>) => { const row = { ...i, id: 'a1', workspaceId: 'w', createdAt: '' }; stored.push(row); return row })
vi.mock('./lib/data', () => ({ answerAttempts: { add: (i: Record<string, unknown>) => add(i), list: async () => [...stored] } }))

const FIRST = 'Um, I worked on various things, you know, and it went fine.'
const SECOND = 'When our checkout was slow I wrote a cache. Page loads dropped from 4 seconds to 1.'
const answers = [{ question: 'Tell me about a time you fixed something?', answer: FIRST }]

afterEach(() => { stored.length = 0; add.mockClear(); document.body.innerHTML = '' })

describe('replay copy', () => {
  it('panel and compare view pass the copy scan', () => {
    const html = [
      renderToStaticMarkup(<ReplayPanel interviewId="i1" answers={answers} />),
      renderToStaticMarkup(<CompareView attempts={[FIRST, SECOND]} />),
      renderToStaticMarkup(<CompareView attempts={[FIRST, FIRST]} />),
      renderToStaticMarkup(<SessionAnswers interviewId="i1" turns={[{ id: 't', questionIndex: 0, question: 'Q?', answer: FIRST, transcriptSource: 'text' }]} onSaveStory={() => {}} />),
    ].join('')
    expect(scanHtml('replay', html)).toEqual([])
  })
})

describe('Say it again', () => {
  it('stores the typed retry once and shows what improved', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => { root.render(<ReplayPanel interviewId="i1" answers={answers} />) })
    const click = async (label: string) => { await act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent?.includes(label))!.click() }) }
    await click('Say it again')
    const area = host.querySelector('textarea')!
    expect(document.activeElement).toBe(area)
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(area, SECOND)
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click('Save this try')
    expect(add).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenCalledWith({ interviewId: 'i1', questionIndex: 0, question: answers[0].question, attempt: 2, answer: SECOND, kind: 'retry', transcriptSource: 'text' })
    expect(host.textContent).toContain('What improved')
    expect(host.textContent).toContain('The result is now included')
    expect(host.querySelector('[aria-live="polite"]')).not.toBeNull()
    await act(async () => root.unmount())
  })
})
