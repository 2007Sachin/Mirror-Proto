// @ts-expect-error node types are not installed in this project; vitest runs under node
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { trackModule } from './index'
import { problems } from './problems'
import { buildHarness, type RunResult } from './runner'

const hasPython = spawnSync('python', ['--version']).status === 0

// Runs the harness text with the system python and reads back the JSON the harness leaves behind.
function runWithPython(code: string, tests: Parameters<typeof buildHarness>[1]): Omit<RunResult, 'ok'> {
  const script = buildHarness(code, tests) + '\nprint(__mirror_result)\n'
  const out = spawnSync('python', ['-I', '-'], { input: script, encoding: 'utf8', timeout: 20000 })
  expect(out.status, out.stderr).toBe(0)
  return JSON.parse(out.stdout.trim().split('\n').pop() as string)
}

describe('python track metadata', () => {
  it('has unique python- ids and the exact topics', () => {
    const ids = problems.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(i => i.startsWith('python-'))).toBe(true)
    for (const p of problems) expect(trackModule.topics).toContain(p.topic)
  })
  it('covers every topic and enough levels', () => {
    for (const t of trackModule.topics) expect(problems.some(p => p.topic === t)).toBe(true)
    const n = (l: number) => problems.filter(p => p.level === l).length
    expect(n(1)).toBeGreaterThanOrEqual(3)
    expect(n(2)).toBeGreaterThanOrEqual(4)
    expect(n(3)).toBeGreaterThanOrEqual(3)
  })
  it('exposes items matching problems', () => {
    expect(trackModule.items).toHaveLength(problems.length)
    expect(trackModule.track).toBe('python')
  })
})

describe('buildHarness', () => {
  it('embeds the code, each test and the result variable', () => {
    const h = buildHarness('def f():\n    return "x"\n', [{ name: 'a "quoted" name', call: 'f()', expected: '"x"' }])
    expect(h).toContain('__mirror_result = json.dumps(__res)')
    expect(h).toContain('"def f():\\n    return \\"x\\"\\n"')
    expect(h).toContain('("a \\"quoted\\" name", "f()", "\\"x\\"")')
  })
})

describe.skipIf(!hasPython)('reference solutions (system python)', () => {
  for (const p of problems) {
    it(`${p.id} passes all its tests`, () => {
      const r = runWithPython(p.solution, p.tests)
      expect(r.error).toBeNull()
      expect(r.results.filter(t => !t.passed)).toEqual([])
      expect(r.results).toHaveLength(p.tests.length)
    })
    it(`${p.id} starter does not already pass`, () => {
      const r = runWithPython(p.starter, p.tests)
      expect(r.results.some(t => !t.passed)).toBe(true)
    })
  }
  it('reports tracebacks, failures and printed output plainly', () => {
    expect(runWithPython('def f(:\n', []).error).toMatch(/SyntaxError/)
    const r = runWithPython('print("hi")\ndef f():\n    return 1 / 0\n', [{ name: 't', call: 'f()', expected: '1' }])
    expect(r.stdout).toBe('hi\n')
    expect(r.results[0]).toMatchObject({ passed: false, detail: 'ZeroDivisionError: division by zero' })
  })
})
