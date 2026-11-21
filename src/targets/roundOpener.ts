import type { Round, Skill } from '../lib/api'

// The first question of a round, built from this job's own skills. Follow-ups come from the live interviewer, which sees the job's open gaps.
type JobFacts = { role: string; skills: Skill[] }
type RoundFacts = Pick<Round, 'id' | 'kind' | 'title'>

const AREAS: Record<string, Skill['area'][]> = { behavioural: ['behavioural'], python: ['python'], tools: ['tools', 'analytics'] }

/** Core skills first, so the first starts cover what the job stresses most. */
function skillsFor(kind: string, skills: Skill[]): string[] {
  const areas = AREAS[kind] ?? []
  const pool = skills.filter(s => areas.includes(s.area))
  return [...pool.filter(s => s.weight === 'core'), ...pool.filter(s => s.weight !== 'core')].map(s => s.name)
}

// Rounds with a live interview today. The Roast Room's live check (docs/roast-room/2026-11-21-targets-rebuild) found the behavioural
// round stays on topic but Python and tools follow-ups drift after the first question, so those stay "Later" until that holds.
// To turn one on, add its kind here: the opener below and the job-aware Director already support it.
const LIVE = ['behavioural']

/** True when this round has a live interview and the job gives it something to talk about: behavioural always does, the others need a skill. */
export function canTalk(kind: string, skills: Skill[]): boolean {
  return LIVE.includes(kind) && (kind === 'behavioural' || skillsFor(kind, skills).length > 0)
}

/** The role string and opening question for start number `n` of this round. Each start moves to the next skill. */
export function roundOpener(round: RoundFacts, job: JobFacts, n = 0): { role: string; question: string } {
  const role = `${job.role} · ${round.title}`.slice(0, 120)
  const names = skillsFor(round.kind, job.skills)
  const skill = names.length ? names[n % names.length] : null
  const question =
    round.kind === 'behavioural'
      ? skill ? `Tell me about a time you used ${skill} to move a decision forward. What did you do, and what changed?`
              : 'Tell me about a time you pushed back on a stakeholder about an analysis. What happened?'
      : round.kind === 'python'
        ? `Tell me about a time you used ${skill} on messy data. What was the question, and what did the result change?`
        : `Walk me through a time you used ${skill} to answer a business question. What did the result change?`
  return { role, question }
}

// Rounds the candidate says will happen (a case study, a hiring-manager call). Kept in this browser only, like every mirror.* key.
const MAX_CUSTOM = 8
const CUSTOM_KEY = (targetId: string) => `mirror.target.v1.${targetId}.custom`
export function loadCustomRounds(targetId: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CUSTOM_KEY(targetId)) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, MAX_CUSTOM) : []
  } catch { return [] }
}
/** Adds a round name if it is new, short and there is room. Returns the list to show. */
export function addCustomRound(targetId: string, raw: string): string[] {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, 60)
  const list = loadCustomRounds(targetId)
  if (!name || list.length >= MAX_CUSTOM || list.some(n => n.toLowerCase() === name.toLowerCase())) return list
  const next = [...list, name]
  try { localStorage.setItem(CUSTOM_KEY(targetId), JSON.stringify(next)) } catch { /* private mode: lasts for this visit */ }
  return next
}
export function removeCustomRound(targetId: string, name: string): string[] {
  const next = loadCustomRounds(targetId).filter(n => n !== name)
  try { localStorage.setItem(CUSTOM_KEY(targetId), JSON.stringify(next)) } catch { /* ignore */ }
  return next
}
/** A round the candidate named: the interviewer opens on it, and follow-ups use all of this job's open gaps. */
export function customRoundOpener(name: string, job: { role: string }): { role: string; question: string } {
  return {
    role: `${job.role} · ${name}`.slice(0, 120),
    question: `Let's start the ${name} round. Tell me about the work that best prepares you for it.`,
  }
}

const KEY = (targetId: string, roundId: string) => `mirror.target.v1.${targetId}.${roundId}`
/** How many times this round has been started, then counts this start. Kept in this browser only. */
export function nextStart(targetId: string, roundId: string): number {
  try {
    const n = Number(localStorage.getItem(KEY(targetId, roundId))) || 0
    localStorage.setItem(KEY(targetId, roundId), String(n + 1))
    return n
  } catch { return 0 }
}
