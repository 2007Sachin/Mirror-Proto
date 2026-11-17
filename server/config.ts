import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

// dotenv is loaded here, and only here.
loadDotenv()

const DEFAULT_NIM_BASE = 'https://integrate.api.nvidia.com/v1'
const DEFAULT_NIM_MODEL = 'nvidia/nemotron-3.5-bolt-e4b'

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(8787),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SITE_URL: z.string().optional(),
    DEMO_MODE: z.string().optional(),
    NODE_ENV: z.string().optional(),
    TRUST_PROXY: z.string().optional(),
    VOICE_LOCAL_ONLY: z.string().optional(),
    AUTH_GOOGLE: z.string().optional(),
    SUPABASE_SECRET_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    NVIDIA_NIM_BASE_URL: z.string().optional(),
    NIM_BASE_URL: z.string().optional(),
    NVIDIA_NIM_API_KEY: z.string().optional(),
    NIM_API_KEY: z.string().optional(),
    NVIDIA_NIM_MODEL: z.string().optional(),
    NIM_MODEL: z.string().optional(),
    SARVAM_API_KEY: z.string().optional(),
    SARVAM_BASE_URL: z.string().default('https://api.sarvam.ai'),
    SARVAM_STT_MODEL: z.string().optional(),
    SARVAM_STT_TRANSPORT: z.enum(['realtime', 'rest']).optional(),
    SARVAM_STT_REALTIME_MODEL: z.string().optional(),
    SARVAM_STT_REALTIME_URL: z.string().optional(),
    SARVAM_STT_ENDPOINTING: z.enum(['manual', 'vad']).optional(),
    SARVAM_TTS_MODEL: z.string().optional(),
    SARVAM_LANGUAGE: z.string().optional(),
    SARVAM_SPEAKER: z.string().optional(),
    SCREEN_DB_READY: z.string().optional(),
    INTERVIEWER_DEADLINE_MS: z.string().optional(),
    INTERVIEW_CALL_BUDGET: z.string().optional(),
    VOICE_NUDGE: z.enum(['shadow', 'on', 'off']).optional(),
    VOICE_NUDGE_SILENCE_MS: z.coerce.number().int().positive().optional(),
    VOICE_NUDGE_SECOND_MS: z.coerce.number().int().positive().optional(),
    VOICE_RAMBLE_MS: z.coerce.number().int().positive().optional(),
    VOICE_RAMBLE_WORDS: z.coerce.number().int().positive().optional(),
  })
  .transform((env, ctx) => {
    const nimBaseRaw = env.NVIDIA_NIM_BASE_URL || env.NIM_BASE_URL || DEFAULT_NIM_BASE
    const nimBaseKey = env.NVIDIA_NIM_BASE_URL ? 'NVIDIA_NIM_BASE_URL' : env.NIM_BASE_URL ? 'NIM_BASE_URL' : 'NVIDIA_NIM_BASE_URL'
    let nimBaseUrl: URL
    try {
      nimBaseUrl = new URL(nimBaseRaw)
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: `${nimBaseKey} is not a valid URL (key: ${nimBaseKey})`,
        path: [nimBaseKey],
      })
      return z.NEVER
    }
    const present = (value: string | undefined) => {
      const trimmed = value?.trim()
      return trimmed ? trimmed : null
    }
    const nimApiKey = present(env.NVIDIA_NIM_API_KEY) ?? present(env.NIM_API_KEY)
    const nimModel = env.NVIDIA_NIM_MODEL || env.NIM_MODEL || DEFAULT_NIM_MODEL
    const supabaseSecret = present(env.SUPABASE_SECRET_KEY) ?? present(env.SUPABASE_SERVICE_ROLE_KEY)
    const siteUrl = (present(env.SITE_URL) ?? 'http://localhost:3000').replace(/\/$/, '')
    if (present(env.DEMO_MODE) === '1' && (env.NODE_ENV === 'production' || siteUrl.startsWith('https://'))) {
      ctx.addIssue({ code: 'custom', message: 'DEMO_MODE=1 disables sign-in and cannot be used in production or with an https SITE_URL (key: DEMO_MODE)', path: ['DEMO_MODE'] })
      return z.NEVER
    }
    return {
      port: env.PORT,
      supabaseUrl: present(env.SUPABASE_URL),
      supabaseAnonKey: present(env.SUPABASE_ANON_KEY),
      /** Service key: tests/admin only. The running app never uses it. */
      supabaseSecretKey: supabaseSecret,
      siteUrl,
      /** TRUST_PROXY=1: read X-Forwarded-For (only behind a proxy that overwrites it). */
      trustProxy: present(env.TRUST_PROXY) === '1',
      /** VOICE_LOCAL_ONLY=1: voice websocket accepts loopback peers only. */
      voiceLocalOnly: present(env.VOICE_LOCAL_ONLY) === '1',
      /** DEMO_MODE=1: one fixed 'dev' user and no sign-in. Never for production. */
      demoMode: present(env.DEMO_MODE) === '1',
      authGoogle: present(env.AUTH_GOOGLE) === '1',
      nimBaseUrl: nimBaseUrl.toString().replace(/\/$/, ''),
      nimApiKey,
      nimModel,
      sarvamApiKey: present(env.SARVAM_API_KEY),
      sarvamBaseUrl: (() => {
        try {
          return new URL(env.SARVAM_BASE_URL).toString().replace(/\/$/, '')
        } catch {
          ctx.addIssue({
            code: 'custom',
            message: 'SARVAM_BASE_URL is not a valid URL (key: SARVAM_BASE_URL)',
            path: ['SARVAM_BASE_URL'],
          })
          return z.NEVER
        }
      })(),
      sarvamSttModel: present(env.SARVAM_STT_MODEL) ?? 'saaras:v4',
      sarvamSttTransport: env.SARVAM_STT_TRANSPORT ?? 'realtime',
      sarvamSttRealtimeModel: present(env.SARVAM_STT_REALTIME_MODEL) ?? 'saaras:v3-realtime',
      sarvamSttRealtimeUrl:
        present(env.SARVAM_STT_REALTIME_URL) ?? 'wss://api.sarvam.ai/speech-to-text-realtime/ws',
      sarvamSttEndpointing: env.SARVAM_STT_ENDPOINTING ?? 'manual',
      sarvamTtsModel: present(env.SARVAM_TTS_MODEL) ?? 'bulbul:v3',
      sarvamLanguage: present(env.SARVAM_LANGUAGE) ?? 'en-IN',
      sarvamSpeaker: present(env.SARVAM_SPEAKER) ?? 'shubh',
      /** Migration 0008 is applied: screens may use variable length and the new columns. */
      screenDbReady: present(env.SCREEN_DB_READY) === '1',
      /** The Room's Interviewer model call deadline, clamped to 500..2000 ms (default 1500). */
      interviewerDeadlineMs: Math.min(2000, Math.max(500, Math.round(Number(present(env.INTERVIEWER_DEADLINE_MS)) || 1500))),
      /** Max model calls per interview (default 12). */
      interviewCallBudget: Math.max(1, Math.round(Number(present(env.INTERVIEW_CALL_BUDGET)) || 12)),
      /** Live-call nudges: shadow logs only (default), on speaks them, off does nothing. */
      voiceNudge: env.VOICE_NUDGE ?? 'shadow',
      voiceNudgeSilenceMs: env.VOICE_NUDGE_SILENCE_MS ?? 10_000,
      voiceNudgeFirstQuestionMs: Math.max(env.VOICE_NUDGE_SILENCE_MS ?? 10_000, 15_000),
      voiceNudgeSecondMs: env.VOICE_NUDGE_SECOND_MS ?? 25_000,
      voiceRambleMs: env.VOICE_RAMBLE_MS ?? 90_000,
      voiceRambleWords: env.VOICE_RAMBLE_WORDS ?? 250,
    }
  })

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const messages = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
  throw new Error(`Invalid environment configuration: ${messages}`)
}

export type Env = typeof parsed.data
export const env: Env = parsed.data

export function isSupabaseConfigured(e: Env): boolean {
  return Boolean(e.supabaseUrl && e.supabaseAnonKey)
}

export function isNimConfigured(e: Env): boolean {
  return Boolean(e.nimApiKey)
}

export function isSarvamConfigured(e: Env): boolean {
  return Boolean(e.sarvamApiKey)
}
