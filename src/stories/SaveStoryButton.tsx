import { useState } from 'react'
import type { StoryRow } from '../lib/data'
import { joinParts, openParts } from './bank'
import { saveStoryFromAnswer } from './saveStory'
import { draftStory } from './starLogic'

export interface SaveStoryButtonProps {
  question: string
  answer: string
  sourceInterviewId?: string | null
  sourceTurnId?: string | null
  onSaved?: (story: StoryRow) => void
  /** Show how complete the story would be before it is saved. On by default; shown only when there is an answer. */
  showCompletion?: boolean
}

export default function SaveStoryButton({ question, answer, sourceInterviewId, sourceTurnId, onSaved, showCompletion = true }: SaveStoryButtonProps) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [gapNote, setGapNote] = useState('')
  const save = async () => {
    setState('saving')
    try { onSaved?.(await saveStoryFromAnswer({ question, answer, sourceInterviewId, sourceTurnId })); setState('saved') } catch { setState('failed') }
  }

  // Which STAR parts the draft would be missing. Each part is worth a quarter.
  const open = answer.trim() ? openParts(draftStory({ question, answer })) : []
  const filled = 4 - open.length
  const complete = open.length === 0
  const preview = showCompletion && answer.trim()

  return (
    <span className="story-save">
      {preview && (
        <span className="story-complete">
          {complete
            ? <span>Complete ✓</span>
            : <><progress value={filled} max={4} aria-label="How much of the story is filled in" /> <span>{filled * 25}%</span></>}
        </span>
      )}
      <button type="button" className="story-btn" disabled={state === 'saving' || state === 'saved' || !answer.trim()} onClick={() => void save()}>
        {state === 'saved' ? 'Saved as a story' : 'Save as a story'}
      </button>
      {preview && !complete && state !== 'saved' && (
        <button type="button" className="story-btn story-btn--quiet" onClick={() => setGapNote(`Add ${joinParts(open)} for a complete story.`)}>Fill gaps</button>
      )}
      {gapNote && !complete && <span role="status"> {gapNote}</span>}
      {state === 'failed' && <span role="status"> Could not save this one. Try again.</span>}
    </span>
  )
}
