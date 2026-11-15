import { useState } from 'react'
import type { StoryRow } from '../lib/data'
import { saveStoryFromAnswer } from './saveStory'

export interface SaveStoryButtonProps {
  question: string
  answer: string
  sourceInterviewId?: string | null
  sourceTurnId?: string | null
  onSaved?: (story: StoryRow) => void
}

export default function SaveStoryButton({ question, answer, sourceInterviewId, sourceTurnId, onSaved }: SaveStoryButtonProps) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const save = async () => {
    setState('saving')
    try { onSaved?.(await saveStoryFromAnswer({ question, answer, sourceInterviewId, sourceTurnId })); setState('saved') } catch { setState('failed') }
  }
  return (
    <span className="story-save">
      <button type="button" className="story-btn" disabled={state === 'saving' || state === 'saved' || !answer.trim()} onClick={() => void save()}>
        {state === 'saved' ? 'Saved as a story' : 'Save as a story'}
      </button>
      {state === 'failed' && <span role="status"> Could not save this one. Try again.</span>}
    </span>
  )
}
