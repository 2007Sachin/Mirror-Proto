// Copy lint for the marketing site, ported from design-ref scaffold/tools/lint_copy.py (banned / soft word lists of the
// copy guide; docs/copy-guide.md is not in this repo, so the lists come from that script) plus the product rules:
// no percentage, no streak words, no "x of y". Scans every string exported from src/site/copy/*.ts (hrefs included).
import { describe, expect, it } from 'vitest'

// "evaluation" and "assessment" are allowed: the product gives an evaluation in plain levels (never a number).
const BANNED = /\b(?:evidence|diagnostics?|assessor|skeptic|scor(?:e|ed|es|ing)|weakness(?:es)?|gaps?|deficienc(?:y|ies)|fail(?:ed|ure|s|ing)?|incorrect|wrong|red flag|critical|candidates?|verdict|analys(?:is|ed|e)|audit|test(?:ed|s|ing)?|verif(?:y|ied)|proof|performance|scrutiny|substantiate|flag(?:s|ged)?)\b/i
const SOFT = /\b(?:claims?|benchmark|thesis|inquiry|prob(?:e|ing)|challenged|unproven|bottleneck)\b/i
const BRAND = /\b(?:amplemarket|duo copilot)\b/i
const PRODUCT: [string, RegExp][] = [
  ['percentage', /\d\s?%|\bpercent(?:age)?\b/i],
  ['streak', /\bstreaks?\b|\bin a row\b/i],
  ['x of y', /\b\d+\s*of\s*\d+\b/i],
]

function scanCopy(where: string, text: string): { hard: string[]; soft: string[] } {
  const hard: string[] = []
  const soft: string[] = []
  const ctx = (m: RegExpExecArray) => `${where}: "${m[0]}" in: ${text.slice(Math.max(0, m.index - 30), m.index + 50)}`
  const rules: [string, RegExp][] = [['banned', BANNED], ['brand', BRAND], ...PRODUCT]
  for (const [name, re] of rules) {
    const m = re.exec(text)
    if (m) hard.push(`[${name}] ${ctx(m)}`)
  }
  const s = SOFT.exec(text)
  if (s) soft.push(`[soft] ${ctx(s)}`)
  return { hard, soft }
}

function strings(v: unknown, path: string, out: [string, string][]) {
  if (typeof v === 'string') out.push([path, v])
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, `${path}.${k}`, out)
}

const modules = import.meta.glob(['./*.ts', '!./*.test.ts'], { eager: true }) as Record<string, Record<string, unknown>>

describe('site copy lint', () => {
  it('finds the copy files', () => {
    expect(Object.keys(modules)).toContain('./shared.ts')
  })

  it('catches what it should (self-check)', () => {
    for (const bad of ['Your score', 'Keep your streak going', 'Question 2 of 5', '90% of people', 'We audit the candidate', 'Amplemarket does it']) {
      expect(scanCopy('x', bad).hard.length, bad).toBeGreaterThan(0)
    }
    expect(scanCopy('x', 'Answer once more and see what changed').hard).toEqual([])
  })

  it('has no banned words, brand names or product-rule breaks in any copy string', () => {
    const hard: string[] = []
    const soft: string[] = []
    for (const [file, mod] of Object.entries(modules)) {
      const found: [string, string][] = []
      strings(mod, file, found)
      for (const [where, text] of found) {
        const r = scanCopy(where, text)
        hard.push(...r.hard)
        soft.push(...r.soft)
      }
    }
    if (soft.length) console.warn(`soft words (review, not failing):\n${soft.join('\n')}`)
    expect(hard).toEqual([])
  })
})
