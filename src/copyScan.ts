// Shared by every copy test (src/copy.test.tsx and each src/copy.<feature>.test.tsx).
// Scans learner-facing text for what must never reach a learner. `scanHtml` needs a DOM, so
// the test file that uses it starts with `// @vitest-environment jsdom`.
import { allowlist } from './copyAllowlist'

// What must never reach a learner.
export const BANNED: [string, RegExp][] = [
  ['banned word', /\b(agentic|evidence|reflect\w*|evaluat\w*)\b/i],
  ['fixed count', /\b\d+ questions?\b|\bof \d+\b|\b(one|two|three|four|five|six)[- ]question\b/i],
  ['percentage', /\d\s?%|\bpercent(age)?\b/i],
  ['streak', /\bstreaks?\b|\bin a row\b/i],
  ['score', /\bscores?\b/i],
  ['start speaking', /start speaking/i],
]

export function scan(where: string, text: string): string[] {
  const hits: string[] = []
  for (const [name, re] of BANNED) {
    const m = re.exec(text)
    if (m && !allowlist.some(a => a.where.test(where) && a.pattern.test(text))) hits.push(`${where} [${name}] "${m[0]}" in: ${text.slice(0, 90)}`)
  }
  return hits
}

// Rendered text plus the attributes a screen reader or a hover can show.
export function scanHtml(where: string, html: string): string[] {
  const root = document.createElement('div')
  root.innerHTML = html
  const texts = [root.textContent ?? '']
  root.querySelectorAll('[aria-label],[placeholder],[title],[alt]').forEach(el => {
    for (const a of ['aria-label', 'placeholder', 'title', 'alt']) { const v = el.getAttribute(a); if (v) texts.push(v) }
  })
  return texts.flatMap(t => scan(where, t))
}

// Keys that hold SQL, code or test data, not learner-facing words.
const CODE_KEYS = new Set(['solution', 'sql', 'seed', 'starter', 'code', 'call', 'expected', 'tests', 'rows', 'cols', 'schema', 'check', 'id', 'topic', 'track', 'tables'])
function walk(where: string, v: unknown, out: string[], depth = 0): void {
  if (depth > 8 || v == null) return
  if (typeof v === 'string') { out.push(...scan(where, v)); return }
  if (Array.isArray(v)) { v.forEach((x, i) => walk(`${where}[${i}]`, x, out, depth + 1)); return }
  if (typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!CODE_KEYS.has(k)) walk(`${where}.${k}`, x, out, depth + 1)
}
export function walkData(where: string, v: unknown): string[] { const out: string[] = []; walk(where, v, out); return out }
