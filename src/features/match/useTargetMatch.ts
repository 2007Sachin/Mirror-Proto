import { useCallback, useEffect, useState } from 'react'
import { getMatch, rerunMatch, saveResumeText, type MatchResult } from '../../lib/matchApi'

/** The résumé-vs-job match for one target. `saveResume` stores pasted text in the profile, then re-runs the match. */
export function useTargetMatch(targetId: string | null) {
  const [data, setData] = useState<MatchResult | null>(null)
  const [loading, setLoading] = useState(Boolean(targetId))
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!targetId) return
    let stop = false
    getMatch(targetId)
      .then(d => { if (!stop) { setData(d); setError(false); setLoading(false) } })
      .catch(() => { if (!stop) { setError(true); setLoading(false) } })
    return () => { stop = true }
  }, [targetId])

  /** Resolves to 'no-profile' when there is no profile to hold the résumé yet. */
  const saveResume = useCallback(async (text: string): Promise<'saved' | 'no-profile'> => {
    if (!targetId) return 'no-profile'
    if (!(await saveResumeText(text))) return 'no-profile'
    setData(await rerunMatch(targetId))
    setError(false)
    return 'saved'
  }, [targetId])

  return { data, loading, error, saveResume }
}
