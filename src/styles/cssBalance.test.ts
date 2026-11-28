import { describe, expect, it } from 'vitest'

// A stray or missing brace breaks the whole stylesheet at build time (Vite shows an error overlay), and no component test sees it.
const sheets = import.meta.glob('../**/*.css', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('stylesheets', () => {
  it('have balanced braces', () => {
    const entries = Object.entries(sheets)
    expect(entries.length).toBeGreaterThan(10)
    for (const [file, raw] of entries) {
      const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')
      const open = (css.match(/\{/g) ?? []).length
      const close = (css.match(/\}/g) ?? []).length
      expect({ file, open }).toEqual({ file, open: close })
    }
  })
})
