import { describe, expect, it } from 'vitest'
import { scan } from './copyScan'
import { replayReason } from './practice/replay'
import type { ItemStat } from './practice/types'

const now = new Date(2026, 10, 15, 12)
const mk = (daysAgo: number, correct: boolean): ItemStat => {
  const at = new Date(2026, 10, 15 - daysAgo, 9).toISOString()
  return { itemId: 'x', track: 'sql', topic: 't', level: 1, attempts: 1, firstTryCorrect: correct, solved: correct, seconds: 1, lastAt: at, solvedAt: null, lastCorrect: correct, history: [{ at, correct }] }
}

describe('spaced replay copy', () => {
  it('passes the banned-pattern scan for every combination', () => {
    const hits: string[] = []
    for (let d = 0; d <= 30; d++) for (const c of [true, false]) for (const iv of [undefined, '2026-11-16', '2026-11-17', '2026-11-19', '2026-12-10']) {
      hits.push(...scan(`replay ${d} ${c} ${iv}`, replayReason(mk(d, c), now, iv)))
    }
    expect(hits).toEqual([])
  })
})
