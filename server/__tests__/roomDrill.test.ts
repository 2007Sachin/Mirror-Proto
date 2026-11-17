import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { runDrill } from '../scripts/room-drill.js'

// A's Director (server/domain/director/director.ts) is not in this worktree; the lead enables the A-only checks once it is merged.
const directorLanded = existsSync(new URL('../domain/director/director.ts', import.meta.url))

describe.each(['fail', 'throttle'] as const)('throttle drill (%s)', mode => {
  it('10 simultaneous interviews all get a question for every turn, none repeated', async () => {
    const out = await runDrill(mode, 10)
    expect(out).toHaveLength(10)
    for (const r of out) {
      expect(r.problems).toEqual([])
      expect(r.questions).toHaveLength(4)
    }
  })
  // Needs A: the bank fallback has no "You said:" prefix.
  it.skipIf(!directorLanded)('falls back to bank questions without a "You said:" prefix', async () => {
    for (const r of await runDrill(mode, 10)) for (const q of r.questions) expect(q).not.toMatch(/^You said/i)
  })
})
