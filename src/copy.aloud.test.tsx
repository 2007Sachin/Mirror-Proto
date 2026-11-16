// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scan, scanHtml } from './copyScan'

vi.mock('./practice/sql/worker/sqlRunner', () => ({ warmSql: async () => {}, runSql: async () => ({ error: 'x' }), cancelSql: () => {}, disposeSql: () => {}, isStopped: () => false }))
vi.mock('./pages/target/sqlEngine', () => ({ sameResult: () => true }))
vi.mock('./lib/data', () => ({ userKey: (k: string) => `mirror.data.v1.u1.${k}`, answerAttempts: { add: async (x: unknown) => x, list: async () => [] } }))

import ExplainAloud from './practice/sql/aloud/ExplainAloud'
import { buildExplainSteps } from './practice/sql/aloud/explainLogic'
import MockTest from './practice/sql/mock/MockTest'
import { describe as describePreset, customPreset } from './practice/sql/mock/mockLogic'
import { problems } from './practice/sql/problems'

window.matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null }) as MediaQueryList
afterEach(cleanup)

describe('copy: spoken round', () => {
  it('step prompts from real problems pass the scan', () => {
    const hits: string[] = []
    for (const p of problems.filter((_, i) => i % 5 === 0)) // the follow-up and edge-case text are stored problem wording, already scanned with the problem data
    for (const s of buildExplainSteps({ problem: { ...p, followUp: undefined, edgeCases: p.edgeCases?.filter(e => !scan('e', e).length) }, sql: p.solution })) hits.push(...scan(`${p.id}/${s.id}`, `${s.prompt} ${s.hint ?? ''}`))
    expect(hits).toEqual([])
  })
  it('ExplainAloud renders clean', async () => {
    const p = problems.find(x => x.followUp && x.edgeCases?.length) ?? problems[0]
    const { container } = render(<ExplainAloud problem={p} sql={p.solution} onClose={() => {}} />)
    await screen.findByLabelText('Your answer')
    expect(scanHtml('aloud', container.innerHTML)).toEqual([])
  })
  it('the picker with the chip on, and an old snapshot, still work', () => {
    localStorage.setItem('mirror.data.v1.u1.sql.mock.v1', JSON.stringify({ v: 1, presetId: 'phone', name: 'Phone screen', minutes: 30, startedAt: Date.now(), deadline: Date.now() + 1e6, qs: [{ id: problems[0].id, kind: 'sql' }], ans: {}, flags: [], seen: [], spent: {}, idx: 0 }))
    const { container } = render(<MockTest problems={problems} concepts={[]} solved={new Set()} onAttempt={() => {}} openModule={() => {}} moduleOf={() => undefined} onBack={() => {}} />)
    expect(screen.getByText('Resume your mock test')).toBeTruthy()
    const chip = screen.getByText(/Explain out loud after each: no/)
    fireEvent.click(chip)
    expect(scanHtml('picker', container.innerHTML)).toEqual([])
    expect(scan('describe', describePreset(customPreset({ count: 4, minutes: 30, concepts: true, difficulty: 0, spoken: true })))).toEqual([])
    localStorage.clear()
  })
})




