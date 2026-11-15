import { useCallback, useEffect, useState } from 'react'
import { answerAttempts, type AnswerAttemptRow } from '../../lib/data'

/** Saved later tries for one question (attempt 1 is the saved turn itself, never stored twice). */
export function useAttempts(interviewId: string | null, questionIndex: number) {
  const [rows, setRows] = useState<AnswerAttemptRow[]>([])
  useEffect(() => {
    if (!interviewId) return
    let live = true
    answerAttempts.list({ interviewId, kind: 'retry' }).then(r => { if (live) setRows(r.filter(x => x.questionIndex === questionIndex)) }).catch(() => {})
    return () => { live = false }
  }, [interviewId, questionIndex])
  const add = useCallback(async (question: string, answer: string) => {
    const row = await answerAttempts.add({ interviewId, questionIndex, question, attempt: rows.length + 2, answer, kind: 'retry', transcriptSource: 'text' })
    setRows(r => [...r, row])
  }, [interviewId, questionIndex, rows.length])
  return { rows, add }
}
