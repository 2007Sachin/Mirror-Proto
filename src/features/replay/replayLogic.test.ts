import { describe, expect, it } from 'vitest'
import { analyseAnswer } from '../../lib/analyse'
import { compareAttempts, fillerLine, highlightSegments, missingStarParts } from './replayLogic'

const A1 = 'Um, I worked on various things, you know, and um it went fine.'
const A2 = 'When our checkout was slow I wrote a cache. Page loads dropped from 4 seconds to 1.'

describe('highlightSegments', () => {
  it('rebuilds the exact text and only marks the learner\'s own words', () => {
    const a = analyseAnswer(A1)
    const segs = highlightSegments(A1, a)
    expect(segs.map(s => s.text).join('')).toBe(A1)
    expect(segs.filter(s => s.kind === 'filler').map(s => s.text.toLowerCase())).toEqual(expect.arrayContaining(['um', 'you know']))
    expect(segs.some(s => s.kind === 'vague')).toBe(true)
  })
  it('merges overlapping spans safely', () => {
    const t = 'I kind of worked on stuff'
    const a = analyseAnswer(t)
    a.vague.push({ phrase: 'kind of worked', span: { start: 2, end: 16, text: t.slice(2, 16) }, why: '' })
    expect(highlightSegments(t, a).map(s => s.text).join('')).toBe(t)
  })
  it('is empty for empty text', () => expect(highlightSegments('', analyseAnswer(''))).toEqual([]))
})

describe('fillerLine and missing parts', () => {
  it('counts as transcribed', () => expect(fillerLine(analyseAnswer(A1))).toBe('um x2, you know x1'))
  it('names missing parts plainly', () => {
    const m = missingStarParts(analyseAnswer('It went fine.'))
    expect(m.map(x => x.name)).toContain('what you did')
    expect(m.every(x => x.tip.length > 0)).toBe(true)
  })
})

describe('compareAttempts', () => {
  it('reports only what improved, singular and plural', () => {
    const r = compareAttempts(analyseAnswer('Um, I fixed it. Um, then uh it worked on stuff.'), analyseAnswer('I fixed it. Then uh it worked on stuff.'))
    expect(r.improved).toBe(true)
    expect(r.lines).toContain('2 fewer filler words')
    expect(compareAttempts(analyseAnswer('Um I built a thing'), analyseAnswer('I built a thing')).lines).toContain('1 fewer filler word')
  })
  it('says a vague phrase became a number and that the result is included', () => {
    const r = compareAttempts(analyseAnswer('I worked on various things.'), analyseAnswer('I built a cache. Loads dropped from 4 seconds to 1.'))
    expect(r.lines).toContain('A vague phrase was replaced with a number')
    expect(r.lines).toContain('The result is now included')
  })
  it('is calm with one suggestion when nothing improved, and never uses numbers like scores', () => {
    const a = analyseAnswer(A1)
    const r = compareAttempts(a, a)
    expect(r.improved).toBe(false)
    expect(r.lines).toHaveLength(2)
    expect(r.lines.join(' ')).not.toMatch(/%|score/i)
  })
  it('handles an answer that is clearly better', () => {
    expect(compareAttempts(analyseAnswer(A1), analyseAnswer(A2)).improved).toBe(true)
  })
})
