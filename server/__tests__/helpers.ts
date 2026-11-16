import type { Env } from '../config.js'
import { buildApp } from '../app.js'
import { testAuth } from '../auth/testAuth.js'
import type { Repository } from '../repo/types.js'
import { createMemoryRepository } from '../repo/memory.js'
import type { ReflectionProvider } from '../providers/types.js'
import type { SttProvider } from '../voice/providers/types.js'
import type { NimLog } from '../providers/nim.js'

export function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    port: 8787,
    supabaseUrl: null,
    supabaseAnonKey: null,
    supabaseSecretKey: null,
    siteUrl: 'http://localhost:3000',
    demoMode: false,
    trustProxy: false,
    voiceLocalOnly: false,
    authGoogle: false,
    nimBaseUrl: 'https://integrate.api.nvidia.com/v1',
    nimApiKey: null,
    nimModel: 'nvidia/nemotron-3.5-bolt-e4b',
    sarvamApiKey: null,
    sarvamBaseUrl: 'https://api.sarvam.ai',
    sarvamSttModel: 'saaras:v4',
    sarvamSttTransport: 'realtime',
    sarvamSttRealtimeModel: 'saaras:v3-realtime',
    sarvamSttRealtimeUrl: 'wss://api.sarvam.ai/speech-to-text-realtime/ws',
    sarvamSttEndpointing: 'manual',
    sarvamTtsModel: 'bulbul:v3',
    sarvamLanguage: 'en-IN',
    sarvamSpeaker: 'shubh',
    screenDbReady: false,
    ...overrides,
  }
}

export function makeApp(deps: { repo?: Repository; env?: Env; provider?: ReflectionProvider | null; stt?: SttProvider; log?: NimLog; aiDeadlineMs?: number; now?: () => number } = {}) {
  const env = deps.env ?? makeEnv()
  const repo = deps.repo ?? createMemoryRepository()
  const app = buildApp({ env, auth: testAuth(), repoFor: () => repo, provider: deps.provider, stt: deps.stt, log: deps.log, aiDeadlineMs: deps.aiDeadlineMs, now: deps.now })
  return { app, repo, env }
}

/** Test auth: the X-Test-User header is the user (and the workspace). */
export const as = (user: string) => ({ 'X-Test-User': user })
export const WS = as('dev')

export function mockProvider(output: unknown): ReflectionProvider {
  return {
    async generateReflection() {
      return output as never
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function j<T = any>(res: Response): Promise<T> {
  return (await res.json()) as T
}
