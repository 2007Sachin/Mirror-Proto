import { describe, expect, it } from 'vitest'
import { LINES } from '../../server/voice/nudgeLines'
import { scan } from '../copyScan'

describe('scripted nudge lines', () => {
  it('pass the copy scan', () => {
    for (const [kind, lines] of Object.entries(LINES)) for (const l of lines) expect(scan('nudge.' + kind, l)).toEqual([])
  })
})
