import { describe, expect, it } from 'vitest'
import { sampleState } from './sampleState'

describe('sampleState', () => {
  it('has exactly one current node, matching state.current', () => {
    const cur = sampleState.worlds.flatMap(w => w.nodes).filter(x => x.status === 'current')
    expect(cur).toHaveLength(1)
    expect(sampleState.current).toBe(cur[0])
    expect(sampleState.worlds).toHaveLength(4)
  })
})
