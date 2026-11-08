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
    return {
      port: env.PORT,
      supabaseUrl: present(env.SUPABASE_URL),
      supabaseSecretKey: supabaseSecret,
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
  return Boolean(e.supabaseUrl && e.supabaseSecretKey)
}

export function isNimConfigured(e: Env): boolean {
  return Boolean(e.nimApiKey)
}

export function isSarvamConfigured(e: Env): boolean {
  return Boolean(e.sarvamApiKey)
}
