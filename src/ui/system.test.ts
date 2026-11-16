// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
// The app tsconfig has no Node types. Vitest runs this file in Node.
// @ts-expect-error node:fs is available to the test runner
import { readFileSync } from 'node:fs'

const systemCss = readFileSync('src/ui/system.css', 'utf8')
const pageCss = ['src/pages/today.css', 'src/pages/targets.css', 'src/pages/sessions.css', 'src/pages/stories.css'].map(file => readFileSync(file, 'utf8'))

function fontSizes(css: string): string[] {
  const withoutTokens = css.replace(/--m-text-[\w-]+\s*:\s*\d+px/g, '')
  return [...withoutTokens.matchAll(/font-size\s*:\s*([^;]+)/g)].map(m => m[1].trim())
}

describe('type scale', () => {
  it('defines the four sizes once', () => {
    expect(systemCss).toMatch(/--m-text-meta:\s*12px/)
    expect(systemCss).toMatch(/--m-text-body:\s*15px/)
    expect(systemCss).toMatch(/--m-text-title:\s*17px/)
    expect(systemCss).toMatch(/--m-text-page:\s*28px/)
    expect(systemCss).toMatch(/--m-leading(?:-tight)?:\s*1\.\d+/)
    expect(systemCss).toMatch(/--m-space-1:\s*4px/)
  })

  it('redesigned pages use the tokens, not a raw size', () => {
    for (const css of [systemCss, ...pageCss]) {
      for (const size of fontSizes(css)) expect(size).toMatch(/^var\(--m-text-/)
    }
  })
})

describe('quiet buttons', () => {
  it('does not paint a quiet button solid black', () => {
    const style = document.createElement('style')
    style.textContent = systemCss
    document.head.appendChild(style)
    const app = document.createElement('div')
    app.className = 'workspace-app'
    const quiet = document.createElement('button')
    quiet.className = 'm-btn m-btn--quiet'
    const filled = document.createElement('button')
    filled.className = 'm-btn'
    app.append(quiet, filled)
    document.body.appendChild(app)
    const quietBg = getComputedStyle(quiet).backgroundColor
    const filledBg = getComputedStyle(filled).backgroundColor
    expect(filledBg).toBe('rgb(29, 29, 31)')
    expect(quietBg).toBe('rgb(255, 255, 255)')
    expect(quietBg).not.toBe(filledBg)
  })
})
