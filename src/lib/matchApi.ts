import { api, ApiError, request, type Source } from './api'
import type { GapMatchRow, ResumeClaimRow } from './data'

export interface MatchProbe { skill: string; quote: string | null; question: string }

/** GET /targets/:id/match. `matches` is the same row shape `data.ts` gapMatches returns. */
export interface MatchResult {
  matches: GapMatchRow[]
  claims: ResumeClaimRow[]
  probes: MatchProbe[]
  source: Source
  /** True when the assistant was asked to reword the questions; `source` then says whether it did. */
  aiAttempted: boolean
  hasResume: boolean
}

export const getMatch = (targetId: string) => request<MatchResult>(`/targets/${encodeURIComponent(targetId)}/match`)
export const rerunMatch = (targetId: string) => request<MatchResult>(`/targets/${encodeURIComponent(targetId)}/match`, { method: 'POST' })

/** Saves pasted résumé text into the existing profile. Returns false when there is no profile yet. */
export async function saveResumeText(text: string): Promise<boolean> {
  try {
    const profile = await api.getProfile()
    await api.saveProfile({ ...profile, resumeText: text.trim().slice(0, 20_000) || null, resumeName: profile.resumeName ?? 'Pasted résumé' })
    return true
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return false
    throw err
  }
}
