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

export function themeMap(stories: { themes: string[] }[]): ThemeMap {
  const has = (id: string) => stories.some(s => s.themes.includes(id))
  return {
    canTell: THEMES.filter(t => has(t.id)).map(t => t.name),
    missing: THEMES.filter(t => !has(t.id)).map(t => t.name),
  }
}

/** STAR parts with no words yet, by their names. */
export function openParts(story: { situation: string; task: string; action: string; result: string }): string[] {
  return PARTS.filter(([key]) => !story[key].trim()).map(([, label]) => label)
}

/** One line. A hint and "no theme matches" never sit in the same sentence. */
export function themeHint(storyTitle: string | null, needs: string | null): string {
  if (storyTitle && needs) return `A hint: ${storyTitle} shares a theme with this role, and a story about ${needs.toLowerCase()} is still open.`
  if (storyTitle) return `A hint: ${storyTitle} shares a theme with this role.`
  if (needs) return `A hint: a story about ${needs.toLowerCase()} is still open.`
  return 'No theme matches yet.'
}

export function rolesNeedStories(
  targets: { id: string; company: string; role: string; skills: Pick<Skill, 'area' | 'name' | 'quote'>[] }[],
  stories: Pick<StoryRow, 'title' | 'themes'>[],
): RoleNeed[] {
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
