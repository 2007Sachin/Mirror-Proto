import { useEffect, useState } from 'react'
import { answerAttempts } from '../../../lib/data'

export interface Saved { question: string; answer: string }

/** The learner's saved explanations for a problem: the latest answer to each question, oldest first. */
export function useSavedExplain(itemId: string, bump = 0): Saved[] | null {
  const [rows, setRows] = useState<{ key: string; saved: Saved[] } | null>(null)
  const key = `${itemId}:${bump}`
  useEffect(() => {
    let live = true
    answerAttempts.list({ itemId, kind: 'explain' }).then(
      r => { if (live) setRows({ key, saved: [...new Map(r.map(a => [a.question, { question: a.question, answer: a.answer }])).values()] }) },
      () => { if (live) setRows({ key, saved: [] }) },
    )
    return () => { live = false }
  }, [itemId, key])
  return rows && rows.key === key ? rows.saved : null
}
