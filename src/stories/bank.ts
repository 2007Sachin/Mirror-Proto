// What the story bank is for: which themes you can tell, which STAR parts are still open,
// and which saved role still needs a story. Names only. No counts.
import type { Skill } from '../lib/api'
import type { StoryRow } from '../lib/data'
import { THEMES, themeName, themesFor } from './themes'

export interface ThemeMap { canTell: string[]; missing: string[] }
export interface RoleNeed { id: string; company: string; role: string; storyTitle: string | null; needs: string | null; needsId: string | null }

const PARTS = [
  ['situation', 'Situation'],
  ['task', 'Task'],
  ['action', 'Action'],
  ['result', 'Result'],
] as const

/** Who the learner is preparing to be: the roles they target and the skills those jobs ask for. */
export interface UserProfile { roles: string[]; skills: string[] }

/**
 * How much each theme matters for these roles and skills. A skill counts double a role. Only themes that matter are present.
 * Used to order lists. It is a ranking, so it is never shown to the learner as a score.
 */
export function computeRoleRelevance(roles: string[], skills: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  const add = (text: string, weight: number) => { for (const t of THEMES) if (t.re.test(text)) out[t.id] = (out[t.id] ?? 0) + weight }
  roles.forEach(r => add(r, 1))
  skills.forEach(s => add(s, 2))
  return out
}

/** Themes you can tell and themes still open. With a profile, each list is ordered by how much the theme matters for that role (names only, no counts). */
export function themeMap(stories: { themes: string[] }[], profile?: UserProfile): ThemeMap {
  const rel = profile ? computeRoleRelevance(profile.roles, profile.skills) : {}
  const ordered = [...THEMES].sort((a, b) => (rel[b.id] ?? 0) - (rel[a.id] ?? 0))
  const has = (id: string) => stories.some(s => s.themes.includes(id))
  return {
    canTell: ordered.filter(t => has(t.id)).map(t => t.name),
    missing: ordered.filter(t => !has(t.id)).map(t => t.name),
  }
}

/** "Task", "Task and Result", "Task, Action and Result". */
export const joinParts = (parts: string[]): string => (parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`)

/** STAR parts with no words yet, by their names. */
export function openParts(story: { situation: string; task: string; action: string; result: string }): string[] {
  return PARTS.filter(([key]) => !story[key].trim()).map(([, label]) => label)
}

/** One line. A hint and "no theme matches" never sit in the same sentence. */
export function themeHint(storyTitle: string | null, needs: string | null, roleTag?: string): string {
  const role = roleTag ? `this ${roleTag} role` : 'this role'
  if (storyTitle && needs) return `A hint: ${storyTitle} shares a theme with ${role}, and a story about ${needs.toLowerCase()} is still open.`
  if (storyTitle) return `A hint: ${storyTitle} shares a theme with ${role}.`
  if (needs) return roleTag ? `A hint: for a ${roleTag} role, a story about ${needs.toLowerCase()} is still open.` : `A hint: a story about ${needs.toLowerCase()} is still open.`
  return 'No theme matches yet.'
}

type Targets = { id: string; company: string; role: string; skills: Pick<Skill, 'area' | 'name' | 'quote'>[] }[]
type SavedStories = Pick<StoryRow, 'title' | 'themes'>[]
/** With a profile: the themes that matter for it and have no story yet, most relevant first, and the ranking behind that order (theme ids). */
export interface ProfileNeeds { missingThemes: string[]; priorityScores: Record<string, number> }

export function rolesNeedStories(targets: Targets, stories: SavedStories): RoleNeed[]
export function rolesNeedStories(profile: UserProfile, stories: SavedStories): ProfileNeeds
export function rolesNeedStories(first: Targets | UserProfile, stories: SavedStories): RoleNeed[] | ProfileNeeds {
  if (!Array.isArray(first)) {
    const rel = computeRoleRelevance(first.roles, first.skills)
    const missing = THEMES.filter(t => (rel[t.id] ?? 0) > 0 && !stories.some(s => s.themes.includes(t.id))).sort((a, b) => rel[b.id] - rel[a.id])
    return { missingThemes: missing.map(t => t.id), priorityScores: Object.fromEntries(missing.map(t => [t.id, rel[t.id]])) }
  }
  const targets = first
  return targets.map(t => {
    const pointed = themesFor(t.skills.map(s => `${s.name} ${s.quote ?? ''}`).join(' '))
    const have = pointed.filter(id => stories.some(s => s.themes.includes(id)))
    const missing = pointed.filter(id => !have.includes(id))
    const story = stories.find(s => have.some(id => s.themes.includes(id)))
    return {
      id: t.id,
      company: t.company,
      role: t.role,
      storyTitle: story?.title ?? null,
      needs: missing[0] ? themeName(missing[0]) : null,
      needsId: missing[0] ?? null,
    }
  })
}

type StarFields = Partial<{ situation: string; task: string; action: string; result: string }>

/**
 * Themes to practise next as [theme id, plain reason] pairs, at most three: first themes that matter for the role and have no story,
 * then themes whose stories still have open STAR parts. Most relevant first.
 */
export function getNextPracticeThemes(profile: UserProfile, stories: (SavedStories[number] & StarFields)[]): [string, string][] {
  const rel = computeRoleRelevance(profile.roles, profile.skills)
  const role = profile.roles[0] ? `a ${profile.roles[0]} role` : 'this role'
  const ranked = THEMES.filter(t => (rel[t.id] ?? 0) > 0).sort((a, b) => rel[b.id] - rel[a.id])
  const out: [string, string][] = []
  for (const t of ranked) {
    const mine = stories.filter(s => s.themes.includes(t.id))
    if (mine.length === 0) out.push([t.id, `${role[0].toUpperCase()}${role.slice(1)} asks about ${t.name.toLowerCase()} and you have no story for it yet.`])
  }
  // A story with no STAR fields at all says nothing about its parts, so it never counts as unfinished.
  const open = (s: SavedStories[number] & StarFields) => ('situation' in s ? openParts({ situation: '', task: '', action: '', result: '', ...s }) : [])
  for (const t of ranked) {
    const mine = stories.filter(s => s.themes.includes(t.id))
    if (mine.length && mine.every(s => open(s).length > 0)) {
      out.push([t.id, `Your story '${mine[0].title}' on ${t.name.toLowerCase()} still has ${joinParts(open(mine[0]).map(p => p.toLowerCase()))} open.`])
    }
  }
  return out.slice(0, 3)
}
