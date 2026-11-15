import * as data from '../lib/data'
import { draftStory } from './starLogic'

export interface SaveStoryArgs { question: string; answer: string; sourceInterviewId?: string | null; sourceTurnId?: string | null }

/** Drafts a card from the answer's own sentences and saves it. The learner edits it afterwards on the Stories page. */
export function saveStoryFromAnswer(a: SaveStoryArgs): Promise<data.StoryRow> {
  const d = draftStory(a)
  return data.stories.create({ ...d, question: a.question || null, sourceInterviewId: a.sourceInterviewId ?? null, sourceTurnId: a.sourceTurnId ?? null })
}
