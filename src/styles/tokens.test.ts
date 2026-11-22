import { describe, expect, it } from 'vitest'
// The app tsconfig has no Node types. Vitest runs this file in Node.
// @ts-expect-error node:fs is available to the test runner
import { readFileSync } from 'node:fs'

const css: string = readFileSync('src/styles/tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Every custom property declaration with the headers of the blocks around it, outermost first. */
function declarations(text: string): { name: string; value: string; within: string[] }[] {
  const out: { name: string; value: string; within: string[] }[] = []
  const stack: string[] = []
  let buf = ''
  for (const ch of text) {
    if (ch === '{') { stack.push(buf.trim()); buf = '' }
    else if (ch === '}') { if (buf.trim().startsWith('--')) push(buf); stack.pop(); buf = '' }
    else if (ch === ';') { push(buf); buf = '' }
    else buf += ch
  }
  function push(s: string) {
    const m = /^\s*(--[a-z0-9-]+)\s*:\s*([\s\S]+)$/.exec(s)
    if (m) out.push({ name: m[1], value: m[2].trim(), within: [...stack] })
  }
  return out
}
const all = declarations(css)
const light = new Map(all.filter(d => d.within.length === 1 && d.within[0] === ':root').map(d => [d.name, d.value]))
const dark = new Map(all.filter(d => d.within.join('|') === '@media (prefers-color-scheme: dark)|:root').map(d => [d.name, d.value]))

describe('foundation tokens', () => {
  it('every declaration sits inside a selector, not at the top of the file or directly inside an @media (the browser drops those)', () => {
    const loose = all.filter(d => d.within.length === 0 || d.within[d.within.length - 1].startsWith('@'))
    expect(loose.map(d => d.name)).toEqual([])
  })

  it('defines the scales the design foundation names', () => {
    const need = [
      '--color-primary', '--color-bg', '--color-surface', '--color-ink', '--color-muted', '--color-accent', '--color-accent-ink', '--color-border', '--color-ring',
      ...[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(n => `--color-neutral-${n}`),
      '--color-semantic-success', '--color-semantic-warning', '--color-semantic-error', '--color-semantic-info',
      '--color-primary-hover', '--color-primary-active', '--color-primary-soft', '--color-focus-ring', '--color-disabled-ink',
      '--font-family-base', '--font-family-code', '--font-size-xs', '--font-size-base', '--font-size-lg',
      '--line-height-base', '--line-height-tight',
      '--spacing-0', '--spacing-xs', '--spacing-xxl', '--space-0', '--space-20',
      '--border-width-0', '--border-width-1', '--border-width-2', '--border-width-3',
      '--radius-none', '--radius-sm', '--radius-md', '--radius-lg', '--radius-full',
      '--shadow-sm', '--shadow-md', '--shadow-lg',
      '--z-index-base', '--z-index-modal', '--z-index-tooltip',
      '--layout-page-max', '--layout-sidebar', '--tap-target',
      '--transition-fast', '--transition-normal', '--transition-slow',
    ]
    expect(need.filter(n => !light.has(n))).toEqual([])
  })

  it('has no third-party font or CDN', () => {
    expect(css).not.toMatch(/googleapis|gstatic|@import\s+url|https?:\/\//)
  })

  it('layers go up in a sensible order', () => {
    const z = (n: string) => Number(light.get(`--z-index-${n}`))
    expect([z('base'), z('raised'), z('sticky'), z('bar'), z('nav'), z('modal'), z('tooltip')]).toEqual([0, 5, 20, 30, 40, 50, 60])
  })
})

// WCAG relative luminance and contrast ratio for #rrggbb.
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
const hex = (mode: 'light' | 'dark', name: string) => {
  const v = (mode === 'dark' ? dark.get(name) : undefined) ?? light.get(name)
  if (v === '#fff') return '#ffffff'
  if (!v || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`${name} is not a plain hex colour in ${mode}: ${v}`)
  return v
}

describe.each(['light', 'dark'] as const)('contrast, %s', mode => {
  const t = (name: string) => hex(mode, `--color-${name}`)
  const text: [string, string, string][] = [
    ['ink', 'bg', 'text on the page'], ['ink', 'surface', 'text on a card'],
    ['muted', 'bg', 'secondary text on the page'], ['muted', 'surface', 'secondary text on a card'],
    ['accent', 'bg', 'accent text on the page'], ['accent', 'surface', 'accent text on a card'],
    ['accent-ink', 'accent', 'text on a filled button'],
    ['success', 'bg', 'success text'], ['warning', 'bg', 'warning text'], ['error', 'bg', 'error text'],
  ]
  it.each(text)('%s on %s is at least 4.5:1 (%s)', (fg, bg) => {
    expect(ratio(t(fg), t(bg))).toBeGreaterThanOrEqual(4.5)
  })
  it('the focus ring is at least 3:1 on the page', () => {
    expect(ratio(t('ring'), t('bg'))).toBeGreaterThanOrEqual(3)
  })
})
