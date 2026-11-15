import { describe, expect, it } from 'vitest'
import { analyseAnswer, countWords, type Analysis } from './analyse'

const filler = (a: Analysis, term: string) => a.fillers.find(f => f.term === term)?.count ?? 0

describe('analyseAnswer: fillers as transcribed', () => {
  it.each([
    ['um', 'Um I started the report and umm checked it.', 2],
    ['uh', 'Uh we shipped it, uhh late.', 2],
    ['erm', 'Erm it was a big one.', 1],
    ['er', 'It was, er, hard.', 1],
    ['hmm', 'Hmm let me think. Hmmm okay.', 2],
    ['you know', 'It was hard, you know, and You know what I mean.', 2],
    ['kind of', 'It was kind of slow.', 1],
    ['sort of', 'We sort of agreed.', 1],
    ['basically', 'Basically we cut the queue.', 1],
    ['literally', 'It was literally everything.', 1],
  ])('counts %s', (term, text, n) => {
    expect(filler(analyseAnswer(text), term)).toBe(n)
  })

  it('counts actually only between commas', () => {
    expect(filler(analyseAnswer('We shipped, actually, on time.'), 'actually')).toBe(1)
    expect(filler(analyseAnswer('Actually I disagreed with the plan.'), 'actually')).toBe(0)
    expect(filler(analyseAnswer('It actually worked.'), 'actually')).toBe(0)
  })

  it('counts like only as a comma-set or "um like" filler', () => {
    expect(filler(analyseAnswer('We went, like, all in.'), 'like')).toBe(1)
    expect(filler(analyseAnswer('Um like we tried it.'), 'like')).toBe(1)
    expect(filler(analyseAnswer('Um, like we tried it.'), 'like')).toBe(1)
  })

  it('does not count like in ordinary use', () => {
    for (const t of ['I would like to lead it.', 'Tools such as SQL helped.', 'I like to plan first.', 'It looked like a bug.', 'We did something like that.']) {
      expect(filler(analyseAnswer(t), 'like'), t).toBe(0)
    }
  })

  it('totals and reports exact spans', () => {
    const text = 'Um, we basically fixed it, you know.'
    const a = analyseAnswer(text)
    expect(a.fillerTotal).toBe(3)
    for (const f of a.fillers) for (const s of f.spans) expect(text.slice(s.start, s.end)).toBe(s.text)
    expect(a.fillers.find(f => f.term === 'um')!.spans[0].text).toBe('Um')
  })
})

describe('analyseAnswer: vague phrases', () => {
  it('flags a weak phrase when the sentence has no number or outcome', () => {
    const a = analyseAnswer('I helped with various reports.')
    expect(a.vague.map(v => v.phrase.toLowerCase())).toEqual(['helped with', 'various'])
    expect(a.vague[0].why).toBe('No result or number here.')
  })

  it('does not flag it when the same sentence has a number or an outcome word', () => {
    expect(analyseAnswer('I worked on 3 dashboards.').vague).toEqual([])
    expect(analyseAnswer('I helped with the rollout and it reduced errors.').vague).toEqual([])
    expect(analyseAnswer('A lot of stuff improved.').vague).toEqual([])
  })

  it('judges each sentence on its own', () => {
    const a = analyseAnswer('I worked on stuff. Sales grew 20 percent.')
    expect(a.vague.map(v => v.phrase)).toEqual(['worked on', 'stuff'])
  })

  it('spans point at the learner words in the original text', () => {
    const text = 'We did   lots of things, etc. and so on'
    const a = analyseAnswer(text)
    expect(a.vague.length).toBeGreaterThan(0)
    for (const v of a.vague) expect(text.slice(v.span.start, v.span.end)).toBe(v.span.text)
  })

  it('does not flag ownership with we', () => {
    expect(analyseAnswer('We decided to move the launch.').vague).toEqual([])
  })
})

describe('analyseAnswer: STAR parts', () => {
  const good = 'Last year our team had a churn problem on the trial plan. I was asked to find out why. I built a cohort query and led the fix. Churn fell by 12 after the change.'
  const poor = 'I helped with stuff.'

  it('finds all four in a good answer', () => {
    expect(analyseAnswer(good).star).toEqual({ situation: true, task: true, action: true, result: true })
  })

  it('finds little in a poor answer', () => {
    expect(analyseAnswer(poor).star).toEqual({ situation: false, task: false, action: false, result: false })
  })

  it('treats a long answer as having set the scene', () => {
    expect(analyseAnswer(`${'word '.repeat(26)}ends here.`).star.situation).toBe(true)
  })

  it('needs an outcome after the action unless there is a digit', () => {
    expect(analyseAnswer('I built the model. Nothing else to add.').star.result).toBe(false)
    expect(analyseAnswer('I built the model. It was faster.').star.result).toBe(true)
    expect(analyseAnswer('I built the model for 40 users.').star.result).toBe(true)
  })
})

describe('analyseAnswer: shape', () => {
  it('splits sentences into exact, trimmed spans and keeps decimals together', () => {
    const text = '  First part.  Second 3.5 part!\nThird?  '
    const a = analyseAnswer(text)
    expect(a.sentences.map(s => s.text)).toEqual(['First part.', 'Second 3.5 part!', 'Third?'])
    for (const s of a.sentences) expect(text.slice(s.start, s.end)).toBe(s.text)
  })

  it('counts words', () => {
    expect(countWords('  one two   three ')).toBe(3)
    expect(countWords('')).toBe(0)
    expect(analyseAnswer('one two three').words).toBe(3)
  })

  it('handles empty and whitespace-only input', () => {
    for (const t of ['', '   \n ']) {
      expect(analyseAnswer(t)).toEqual({
        words: 0, sentences: [], fillers: [], fillerTotal: 0, vague: [], star: { situation: false, task: false, action: false, result: false },
      })
    }
  })

  it('never throws on unicode and keeps spans exact', () => {
    const text = 'Ich habe 😀 um, basically, café ünïcode 日本語 "quotes" — I helped with ✨ things.'
    const a = analyseAnswer(text)
    for (const s of [...a.sentences, ...a.fillers.flatMap(f => f.spans), ...a.vague.map(v => v.span)]) expect(text.slice(s.start, s.end)).toBe(s.text)
    expect(() => analyseAnswer('\u0000\ud800 lone surrogate. 😀')).not.toThrow()
  })

  it('does not mutate or retain state between calls', () => {
    const text = 'Um, I helped with things.'
    const first = JSON.stringify(analyseAnswer(text))
    expect(text).toBe('Um, I helped with things.')
    expect(JSON.stringify(analyseAnswer(text))).toBe(first)
  })
})
