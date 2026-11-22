// "Needs more work" memory for interview prep. A flag is a role + round + question index the user wants to revisit.
// Kept in this browser only (localStorage, cleared on sign-out with every other mirror.* key). Nothing is sent anywhere and nothing is scored.
export const WEAK_KEY = 'mirror.prep.v1.weakspots'

export type WeakSpot = { role: string; round: number; question: number }
export type WeakSpots = WeakSpot[]

const valid = (s: unknown): s is WeakSpot => {
  const w = s as WeakSpot
  return !!w && typeof w.role === 'string' && w.role !== '' && Number.isInteger(w.round) && w.round >= 0 && Number.isInteger(w.question) && w.question >= 0
}
const same = (a: WeakSpot, b: WeakSpot) => a.role === b.role && a.round === b.round && a.question === b.question

/** Reads the stored list; anything unreadable or malformed is dropped rather than thrown. */
export function parseWeakSpots(raw: string | null): WeakSpots {
  try {
    const s = JSON.parse(raw ?? 'null')
    if (!s || !Array.isArray(s.items)) return []
    return s.items.filter(valid).map((w: WeakSpot) => ({ role: w.role, round: w.round, question: w.question })).filter((w: WeakSpot, i: number, all: WeakSpots) => all.findIndex(x => same(x, w)) === i)
  } catch { return [] }
}

export const isWeak = (list: WeakSpots, spot: WeakSpot) => list.some(w => same(w, spot))
/** Adds a flag; marking twice keeps one. */
export const markWeak = (list: WeakSpots, spot: WeakSpot): WeakSpots => (isWeak(list, spot) || !valid(spot) ? list : [...list, { role: spot.role, round: spot.round, question: spot.question }])
export const unmarkWeak = (list: WeakSpots, spot: WeakSpot): WeakSpots => list.filter(w => !same(w, spot))
export const toggleWeak = (list: WeakSpots, spot: WeakSpot): WeakSpots => (isWeak(list, spot) ? unmarkWeak(list, spot) : markWeak(list, spot))
/** Flags for one role, ordered by round then question. */
export const weakForRole = (list: WeakSpots, role: string): WeakSpots => list.filter(w => w.role === role).sort((a, b) => a.round - b.round || a.question - b.question)
export const weakCount = (list: WeakSpots, role: string, round: number) => list.filter(w => w.role === role && w.round === round).length
/** Clears one role, or everything when no role is given. */
export const clearWeak = (list: WeakSpots, role?: string): WeakSpots => (role === undefined ? [] : list.filter(w => w.role !== role))

export function loadWeakSpots(storage: Pick<Storage, 'getItem'> = localStorage): WeakSpots {
  try { return parseWeakSpots(storage.getItem(WEAK_KEY)) } catch { return [] }
}
export function saveWeakSpots(list: WeakSpots, storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage) {
  try { if (list.length) storage.setItem(WEAK_KEY, JSON.stringify({ items: list })); else storage.removeItem(WEAK_KEY) } catch { /* private mode: lasts for this visit */ }
}
