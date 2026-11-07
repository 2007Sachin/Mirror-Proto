import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

// dotenv is loaded here, and only here.
loadDotenv()

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(8787),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    NIM_BASE_URL: z.string().default('https://integrate.api.nvidia.com/v1'),
    // SETUP-INFRA.md contract uses NVIDIA_NIM_API_KEY; NIM_API_KEY accepted as
    // a convenience alias.
    NVIDIA_NIM_API_KEY: z.string().optional(),
    NIM_API_KEY: z.string().optional(),
    NIM_MODEL: z.string().default('meta/llama-3.3-70b-instruct'),
    // Sarvam AI voice providers (Phase 2). Absent key → mock dev fallback.
    SARVAM_API_KEY: z.string().optional(),
    SARVAM_BASE_URL: z.string().default('https://api.sarvam.ai'),
  })
  .transform((env, ctx) => {
    let nimBaseUrl: URL
    try {
      nimBaseUrl = new URL(env.NIM_BASE_URL)
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'NIM_BASE_URL is not a valid URL (key: NIM_BASE_URL)',
        path: ['NIM_BASE_URL'],
      })
      return z.NEVER
    }
    const nimApiKey = env.NVIDIA_NIM_API_KEY ?? env.NIM_API_KEY ?? null
    return {
      port: env.PORT,
      supabaseUrl: env.SUPABASE_URL ?? null,
      supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? null,
      nimBaseUrl: nimBaseUrl.toString().replace(/\/$/, ''),
      nimApiKey,
      nimModel: env.NIM_MODEL,
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
  return Boolean(e.supabaseUrl && e.supabaseServiceRoleKey)
}

export function isNimConfigured(e: Env): boolean {
  return Boolean(e.nimApiKey)
}
