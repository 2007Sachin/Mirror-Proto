// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { BANNED, scan, scanHtml, walkData } from './copyScan'

describe('copyScan helpers', () => {
  it('exports the three banned patterns', () => {
    expect(BANNED.map(([name]) => name)).toEqual(['banned word', 'fixed count', 'percentage'])
  })

  it('scan flags each pattern and passes calm copy', () => {
    expect(scan('x', 'Your evidence')).toHaveLength(1)
    expect(scan('x', 'We will reflect on it')).toHaveLength(1)
    expect(scan('x', 'Answer 5 questions')).toHaveLength(1)
    expect(scan('x', 'Step 2 of 6')).toHaveLength(1)
    expect(scan('x', 'Up 40%')).toHaveLength(1)
    expect(scan('x', 'Say it again in your own words.')).toEqual([])
  })

  it('scanHtml reads text and accessible attributes', () => {
    expect(scanHtml('x', '<p>Fine</p><input placeholder="evidence" />')).toHaveLength(1)
    expect(scanHtml('x', '<img alt="a 50% score" /><p>ok</p>')).toHaveLength(1)
    expect(scanHtml('x', '<p>Plain words</p>')).toEqual([])
  })

  it('walkData skips code keys and reports the path', () => {
    const hits = walkData('d', { prompt: 'fine', nested: [{ hint: 'the evidence' }], solution: 'SELECT 5%' })
    expect(hits).toHaveLength(1)
    expect(hits[0]).toContain('d.nested[0].hint')
  })

  it('applies the allowlist by label and pattern', () => {
    expect(walkData('data:stats items[0]', { prompt: 'A 95% interval' })).toEqual([])
    expect(walkData('data:other', { prompt: 'A 95% interval' })).toHaveLength(1)
  })
})
