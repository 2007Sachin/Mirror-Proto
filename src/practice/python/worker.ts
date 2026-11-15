// Runs Pyodide off the main thread. Plain Python only: no packages are loaded.
// Pinned release, loaded from the jsDelivr CDN.
const INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

interface Py { runPython(code: string): unknown; globals: { get(name: string): unknown } }
const ctx = self as unknown as { postMessage(m: unknown): void; onmessage: ((e: MessageEvent) => void) | null }

let py: Py | null = null

async function boot() {
  try {
    const mod = await import(/* @vite-ignore */ INDEX_URL + 'pyodide.mjs')
    py = await mod.loadPyodide({ indexURL: INDEX_URL })
    ctx.postMessage({ type: 'ready' })
  } catch (e) {
    ctx.postMessage({ type: 'failed', message: String(e) })
  }
}

ctx.onmessage = (e: MessageEvent) => {
  const m = e.data
  if (m.type !== 'run' || !py) return
  try {
    py.runPython(m.harness)
    ctx.postMessage({ type: 'result', id: m.id, json: String(py.globals.get('__mirror_result')) })
  } catch (err) {
    ctx.postMessage({ type: 'result', id: m.id, error: String(err).split('\n').filter(Boolean).pop() })
  }
}

void boot()
