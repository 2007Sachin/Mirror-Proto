import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// A stray or missing brace breaks the whole stylesheet at build time (Vite shows an error overlay), and no component test sees it.
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : p.endsWith('.css') ? [p] : [] })

describe('stylesheets', () => {
  it('have balanced braces', () => {
    for (const f of files('src')) {
      const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const open = (css.match(/\{/g) ?? []).length
      const close = (css.match(/\}/g) ?? []).length
      expect({ f, open }).toEqual({ f, open: close })
    }
  })
})
