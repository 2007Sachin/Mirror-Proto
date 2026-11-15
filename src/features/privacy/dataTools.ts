// Export and delete for the signed-in user's own data. Server routes: GET /me/export, DELETE /me/data.
import { request } from '../../lib/api'
import * as data from '../../lib/data'

/** Fetches the export and hands it to the browser as a JSON file. Resolves with the file name. */
export async function exportMyData(): Promise<string> {
  const out = await request<unknown>('/me/export')
  const name = `mirror-export-${new Date().toISOString().slice(0, 10)}.json`
  const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return name
}

/** Everything this app keeps in the browser starts with "mirror." (drafts, practice progress, the open session). */
function clearBrowserKeys(store: Storage): void {
  try {
    for (const k of Object.keys(store)) if (k.startsWith('mirror.')) store.removeItem(k)
  } catch { /* storage can be blocked */ }
}

/** Removes the server copy, then this browser's copy. Throws if the server refused, and then nothing local is cleared. */
export async function deleteMyData(): Promise<void> {
  await request<{ deleted: boolean }>('/me/data', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE' }) })
  await data.clearAll()
  clearBrowserKeys(localStorage)
  clearBrowserKeys(sessionStorage)
}
