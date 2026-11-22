// Interview-date plan: spreads a role's rounds over the days left. Pure and on-device; the date is kept in this browser only (cleared on sign-out with every other mirror.* key). Nothing is sent anywhere and nothing is scored.
export const MAX_PLAN_DAYS = 28
export const planKey = (roleId: string) => `mirror.prep.v1.plan.${roleId}`

export type PlanDay = { date: string; day: number; kind: 'round' | 'revisit'; round: number | null }
export type Plan =
  | { status: 'none' }
  | { status: 'past'; daysAgo: number }
  | { status: 'ready'; daysToGo: number; days: PlanDay[] }

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/
/** Whole days since 1970-01-01 for a calendar date, or null when it is not a real date. Calendar maths only, so time zones and daylight saving never shift a day. */
const dayNumber = (iso: string): number | null => {
  const m = ISO.exec(iso)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const t = Date.UTC(y, mo - 1, d)
  const back = new Date(t)
  return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d ? t / 86_400_000 : null
}
const addDays = (iso: string, n: number) => new Date((dayNumber(iso) as number + n) * 86_400_000).toISOString().slice(0, 10)

export const isIsoDate = (s: unknown): s is string => typeof s === 'string' && dayNumber(s) !== null
/** Today's date in the browser's own time zone, as YYYY-MM-DD. */
export const isoToday = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/**
 * One round per day from today, then a last day to revisit weak spots. The plan runs for the days left before the interview (at most 28, at least 1).
 * With fewer days than rounds the rounds are spread evenly and some are skipped; the interview day itself is the only day when it is today.
 */
export function buildPlan(roundCount: number, interviewDate: string | null, today: string): Plan {
  const end = interviewDate === null ? null : dayNumber(interviewDate)
  const start = dayNumber(today)
  if (end === null || start === null) return { status: 'none' }
  const daysToGo = end - start
  if (daysToGo < 0) return { status: 'past', daysAgo: -daysToGo }
  const total = Math.min(MAX_PLAN_DAYS, Math.max(1, daysToGo))
  const rounds = Math.max(0, Math.floor(roundCount))
  const focus = total - 1
  const days: PlanDay[] = []
  for (let i = 0; i < focus; i++) days.push({ date: addDays(today, i), day: i + 1, kind: 'round', round: rounds ? Math.floor((i * rounds) / focus) : null })
  days.push({ date: addDays(today, focus), day: total, kind: 'revisit', round: null })
  return { status: 'ready', daysToGo, days }
}

/** Saved date for a role, or null when missing, unreadable or not a real date. */
export function loadPlanDate(roleId: string, storage: Pick<Storage, 'getItem'> = localStorage): string | null {
  try { const s = storage.getItem(planKey(roleId)); return isIsoDate(s) ? s : null } catch { return null }
}
export function savePlanDate(roleId: string, date: string | null, storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage) {
  try { if (date && isIsoDate(date)) storage.setItem(planKey(roleId), date); else storage.removeItem(planKey(roleId)) } catch { /* private mode: lasts for this visit */ }
}

/** "Rounds practiced X of Y · Revisit items Z". No score, no grade. */
export const readinessLine = (practiced: number, rounds: number, revisit: number) => `Rounds practiced ${practiced} of ${rounds} · Revisit items ${revisit}`
