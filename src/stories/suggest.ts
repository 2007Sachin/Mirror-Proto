// Suggest saved stories: theme overlap first, then the newest. With the learner's progress, stories that fill a theme gap come first. Pure.
import type { StoryRow } from '../lib/data'
import { themeName, themesFor } from './themes'

/** Where the learner is with the story themes. Ids are theme ids from themes.ts. */
export interface UserProgress {
  /** Themes with a finished story. */
  completedThemes: string[]
  /** Themes the learner has started on but not finished. */
  openThemes: string[]
  /** Themes they have met in practice but have no story for. */
  exploredThemes: string[]
  storyCountPerTheme: Record<string, number>
}
export interface Suggestion { story: StoryRow; reason: string; gapAnalysis?: string; relevanceScore?: number }
export interface GapSuggestion { story: StoryRow; gapAnalysis: string; relevanceScore: number }

const ASKS: Record<string, string> = {
  'deadline-pressure': 'a tight deadline', 'data-driven': 'a decision made with data', 'customer-focus': 'customers',
  'mistake-recovery': 'a mistake and how you recovered', ambiguity: 'an unclear situation',
}

const PARTS = ['situation', 'task', 'action', 'result'] as const
const fullness = (s: StoryRow) => PARTS.filter(k => (s[k] ?? '').trim()).length
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const names = (ids: string[]) => list(ids.map(i => themeName(i).toLowerCase()))

/** What a story does for the learner's gaps. A gap is a theme they have started or met but have no finished story for. */
function assess(story: StoryRow, p: UserProgress) {
  const gaps = new Set([...p.openThemes, ...p.exploredThemes].filter(t => !p.completedThemes.includes(t)))
  const fills = story.themes.filter(t => gaps.has(t))
  const covered = story.themes.filter(t => p.completedThemes.includes(t))
  const others = story.themes.length - fills.length - covered.length
  // Themes with fewer stories count for more, so the first story on a theme beats a third one.
  const scarce = fills.reduce((n, t) => n + 1 / (1 + (p.storyCountPerTheme[t] ?? 0)), 0)
  const relevanceScore = Math.round((fills.length * 2 + scarce + others + fullness(story) / 4) * 100) / 100
  const gapAnalysis = fills.length
    ? `Fills your open ${fills.length === 1 ? 'theme' : 'themes'}: ${names(fills)}.`
    : covered.length ? `Adds another story on ${names(covered)}, which you already cover.` : 'Does not fill an open theme yet.'
  return { fills, relevanceScore, gapAnalysis }
}

/** Saved stories that fill the learner's theme gaps, best first: gap-filling, then relevance, then newest, then the fuller STAR. At most five. */
export function getSuggestions(progress: UserProgress, stories: StoryRow[]): GapSuggestion[] {
  return stories
    .map(story => ({ story, ...assess(story, progress) }))
    .sort((a, b) => b.fills.length - a.fills.length || b.relevanceScore - a.relevanceScore || b.story.createdAt.localeCompare(a.story.createdAt) || fullness(b.story) - fullness(a.story))
    .slice(0, 5)
    .map(({ story, gapAnalysis, relevanceScore }) => ({ story, gapAnalysis, relevanceScore }))
}

export function suggestStories(question: string, stories: StoryRow[], progress?: UserProgress): Suggestion[] {
  const wanted = themesFor(question ?? '')
  if (!wanted.length) return []
  return stories
    .map(story => ({ story, hits: wanted.filter(t => story.themes.includes(t)), gap: progress ? assess(story, progress) : null }))
    .filter(x => x.hits.length)
    .sort((a, b) =>
      (b.gap?.fills.length ?? 0) - (a.gap?.fills.length ?? 0) ||
      b.hits.length - a.hits.length ||
      b.story.createdAt.localeCompare(a.story.createdAt) ||
      (progress ? fullness(b.story) - fullness(a.story) : 0))
    .slice(0, 3)
    .map(({ story, hits, gap }) => ({
      story,
      reason: `'${story.title}' is tagged ${hits.map(h => themeName(h).toLowerCase()).join(' and ')}, and this question asks about ${ASKS[hits[0]] ?? themeName(hits[0]).toLowerCase()}.`,
      ...(gap ? { gapAnalysis: gap.gapAnalysis, relevanceScore: gap.relevanceScore } : {}),
    }))
}
