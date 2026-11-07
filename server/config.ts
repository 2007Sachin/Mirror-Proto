import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

// dotenv is loaded here, and only here.
loadDotenv()

const DEFAULT_NIM_BASE = 'https://integrate.api.nvidia.com/v1'
const DEFAULT_NIM_MODEL = 'meta/llama-3.3-70b-instruct'

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
    const nimApiKey = env.NVIDIA_NIM_API_KEY ?? env.NIM_API_KEY ?? null
    const nimModel = env.NVIDIA_NIM_MODEL || env.NIM_MODEL || DEFAULT_NIM_MODEL
    const supabaseSecret = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? null
    return {
      port: env.PORT,
      supabaseUrl: env.SUPABASE_URL ?? null,
      supabaseSecretKey: supabaseSecret,
      nimBaseUrl: nimBaseUrl.toString().replace(/\/$/, ''),
      nimApiKey,
      nimModel,
      sarvamApiKey: env.SARVAM_API_KEY ?? null,
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
