// Suggest saved stories for a new question: theme overlap first, then the newest. Pure.
import type { StoryRow } from '../lib/data'
import { themeName, themesFor } from './themes'

export interface Suggestion { story: StoryRow; reason: string }

const ASKS: Record<string, string> = {
  'deadline-pressure': 'a tight deadline', 'data-driven': 'a decision made with data', 'customer-focus': 'customers',
  'mistake-recovery': 'a mistake and how you recovered', ambiguity: 'an unclear situation',
}

export function suggestStories(question: string, stories: StoryRow[]): Suggestion[] {
  const wanted = themesFor(question ?? '')
  if (!wanted.length) return []
  return stories
    .map(story => ({ story, hits: wanted.filter(t => story.themes.includes(t)) }))
    .filter(x => x.hits.length)
    .sort((a, b) => b.hits.length - a.hits.length || b.story.createdAt.localeCompare(a.story.createdAt))
    .slice(0, 3)
    .map(({ story, hits }) => ({
      story,
      reason: `'${story.title}' is tagged ${hits.map(h => themeName(h).toLowerCase()).join(' and ')}, and this question asks about ${ASKS[hits[0]] ?? themeName(hits[0]).toLowerCase()}.`,
    }))
}
