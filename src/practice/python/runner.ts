import type { PyTest } from './problems'

export interface TestResult { name: string; passed: boolean; detail?: string }
export interface RunResult { ok: boolean; stdout: string; results: TestResult[]; error?: string }
export type RuntimeState = 'idle' | 'downloading' | 'ready' | 'failed'

/**
 * Builds the Python script that runs the learner's code, then each test. It leaves a JSON string in
 * `__mirror_result`. Pure string builder so it can be tested (and run with a system python) without Pyodide.
 */
export function buildHarness(code: string, tests: PyTest[]): string {
  const lit = (s: string) => JSON.stringify(s) // a JSON string is a valid Python string literal
  const rows = tests.map(t => `(${lit(t.name)}, ${lit(t.call)}, ${lit(t.expected)})`).join(',\n    ')
  return `import json, io, traceback, contextlib
__buf = io.StringIO()
__res = {"stdout": "", "results": [], "error": None}
def __last(e):
    return traceback.format_exception_only(type(e), e)[-1].strip()
__ns = {"__name__": "__main__"}
try:
    with contextlib.redirect_stdout(__buf):
        exec(compile(${lit(code)}, "your code", "exec"), __ns)
except BaseException as e:
    __res["error"] = __last(e)
else:
    for __name, __call, __exp in [
    ${rows}
    ]:
        try:
            with contextlib.redirect_stdout(__buf):
                __got = eval(__call, __ns)
            __want = eval(__exp, {})
            if __got == __want:
                __res["results"].append({"name": __name, "passed": True})
            else:
                __res["results"].append({"name": __name, "passed": False, "detail": "Got " + repr(__got) + ", expected " + repr(__want)})
        except BaseException as e:
            __res["results"].append({"name": __name, "passed": False, "detail": __last(e)})
__res["stdout"] = __buf.getvalue()[:5000]
__mirror_result = json.dumps(__res)
`
}

const TIMEOUT_MSG = 'Your code ran too long. Check for a loop that never ends.'

interface Raw { stdout?: string; results?: TestResult[]; error?: string | null }
type Pending = { resolve(r: RunResult): void; timer: ReturnType<typeof setTimeout> }

/** Main-thread side of the Pyodide worker. The worker is created lazily by ensureReady(). */
export class PythonRunner {
  state: RuntimeState = 'idle'
  private worker: Worker | null = null
  private ready: Promise<void> | null = null
  private pending = new Map<number, Pending>()
  private nextId = 1
  private listeners = new Set<(s: RuntimeState) => void>()

  onState(fn: (s: RuntimeState) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  private set(s: RuntimeState) { this.state = s; this.listeners.forEach(f => f(s)) }

  ensureReady(): Promise<void> {
    if (this.ready) return this.ready
    this.set('downloading')
    const ready = new Promise<void>((resolve, reject) => {
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      this.worker = w
      w.onmessage = (e: MessageEvent) => {
        const m = e.data
        if (m.type === 'ready') { this.set('ready'); resolve() }
        else if (m.type === 'failed') { this.kill(); this.set('failed'); reject(new Error(m.message)) }
        else if (m.type === 'result') this.finish(m.id, m.json ? JSON.parse(m.json) : { error: m.error || 'The Python runtime stopped.' })
      }
      w.onerror = () => { this.kill(); this.set('failed'); reject(new Error('worker')) }
    })
    ready.catch(() => { this.ready = null }) // allow Retry
    this.ready = ready
    return ready
  }

  private finish(id: number, raw: Raw) {
    const p = this.pending.get(id)
    if (!p) return
    clearTimeout(p.timer)
    this.pending.delete(id)
    const results = raw.results ?? []
    const error = raw.error || undefined
    p.resolve({ ok: !error && results.length > 0 && results.every(r => r.passed), stdout: raw.stdout ?? '', results, error })
  }

  async run(code: string, tests: PyTest[], timeoutMs = 10000): Promise<RunResult> {
    await this.ensureReady()
    const w = this.worker
    if (!w) return { ok: false, stdout: '', results: [], error: 'The Python runtime is not ready.' }
    const id = this.nextId++
    return new Promise<RunResult>(resolve => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        this.kill() // no SharedArrayBuffer: the only way to stop a runaway loop is to end the worker
        this.ready = null
        this.set('idle')
        resolve({ ok: false, stdout: '', results: [], error: TIMEOUT_MSG })
        void this.ensureReady().catch(() => {}) // respawn so the next Run is quick
      }, timeoutMs)
      this.pending.set(id, { resolve, timer })
      w.postMessage({ type: 'run', id, harness: buildHarness(code, tests) })
    })
  }

  /** Ends the worker and settles anything in flight. Safe to call twice. */
  dispose() {
    this.kill()
    this.ready = null
    this.state = 'idle'
    this.listeners.clear()
  }

  private kill() {
    this.worker?.terminate()
    this.worker = null
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer)
      p.resolve({ ok: false, stdout: '', results: [], error: 'Stopped.' })
      this.pending.delete(id)
    }
  }
}
