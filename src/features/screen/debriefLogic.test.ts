import { describe, expect, it } from 'vitest'
import { buildListenFor, missingParts, pickWeakest } from './debriefLogic'
import { screenLine, screenMilestone } from './countdown'

const strong = 'Last year our team had a slow weekly report. I led the rebuild in Tableau and wrote the SQL behind it. The report now loads in 4 seconds instead of 40.'
const weak = 'Um, I worked on various things and, you know, helped with stuff.'
const turns = [{ question: 'Q1?', answer: strong }, { question: 'Q2?', answer: weak }]

describe('buildListenFor', () => {
  const items = buildListenFor(turns, ['Tableau', 'SQL'])
  it('quotes only exact pieces of the learner’s own answers', () => {
    for (const it of items) for (const q of it.quotes) expect(turns[q.turn].answer).toContain(q.text)
  })
  it('lists at most two quotes and says plainly when nothing showed', () => {
    for (const it of items) expect(it.quotes.length).toBeLessThanOrEqual(2)
    const none = buildListenFor([{ question: 'Q?', answer: 'It was fine and I enjoyed the team around me every day at work' }], ['Tableau'])
    const jobwords = none.find(i => i.id === 'jobwords')!
    expect(jobwords.found).toBe(false)
    expect(jobwords.quotes).toEqual([])
    expect(jobwords.tip.length).toBeGreaterThan(10)
  })
  it('finds ownership, outcome and the job’s own words in the strong answer', () => {
    expect(items.find(i => i.id === 'ownership')!.quotes[0].text).toContain('I led')
    expect(items.find(i => i.id === 'jobwords')!.found).toBe(true)
    expect(items.find(i => i.id === 'outcomes')!.found).toBe(true)
  })
  it('never shows a score, percentage or count', () => {
    const text = JSON.stringify(items.map(i => [i.label, i.tip]))
    expect(text).not.toMatch(/\d\s?%|\bscore\b|\bof \d+\b/i)
  })
})

describe('pickWeakest', () => {
  it('picks the answer with the fewest parts, then most fillers, then shortest', () => {
    expect(pickWeakest(turns)).toBe(1)
    expect(pickWeakest([])).toBeNull()
    const a = 'Um um I worked on stuff'
    const b = 'I worked on stuff'
    expect(pickWeakest([{ question: 'q', answer: b }, { question: 'q', answer: a }])).toBe(1)
  })
  it('names what is missing in plain words', () => {
    expect(missingParts(weak)).toMatch(/did not yet say/)
  })
})

describe('countdown text', () => {
  it('is calm and only marks 5, 2 and 1 minutes', () => {
    expect(screenLine(6 * 60000 - 1000)).toBe('About 6 minutes left.')
    expect(screenLine(30000)).toBe('About a minute left.')
    expect(screenLine(0)).toBe('Time is up.')
    expect(screenMilestone(6 * 60000, 8 * 60000)).toBeNull()
    expect(screenMilestone(5 * 60000, 8 * 60000)).toBe('Five minutes left.')
    expect(screenMilestone(2 * 60000, 8 * 60000)).toBe('Two minutes left.')
    expect(screenMilestone(50000, 8 * 60000)).toBe('One minute left.')
  })
})
