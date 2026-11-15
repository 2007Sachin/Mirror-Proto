import type { Env } from '../config.js'

export type SttProviderName = 'sarvam' | 'mock' | 'none'

/**
 * Which speech-to-text provider this server uses.
 * - `sarvam` when SARVAM_API_KEY is set.
 * - `mock` ONLY when VOICE_MOCK_STT=1 (tests/dev smoke); it never invents an answer.
 * - `none` otherwise: voice is unavailable and the learner types instead.
 * STT_PROVIDER (sarvam | mock | none) can force a choice, but never past a missing key or flag.
 */
export function sttProviderName(env: Env, vars: NodeJS.ProcessEnv = process.env): SttProviderName {
  const mockFlag = vars.VOICE_MOCK_STT === '1'
  const auto: SttProviderName = env.sarvamApiKey ? 'sarvam' : mockFlag ? 'mock' : 'none'
  const want = (vars.STT_PROVIDER ?? '').trim().toLowerCase()
  const choice = want === 'sarvam' || want === 'mock' || want === 'none' ? want : auto
  if (choice === 'sarvam' && !env.sarvamApiKey) return 'none'
  if (choice === 'mock' && !mockFlag) return 'none'
  return choice
}
