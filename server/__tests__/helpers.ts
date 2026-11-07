import type { Env } from '../config.js'
import { buildApp, type AppDeps } from '../app.js'
import { createMemoryRepository } from '../repo/memory.js'
import type { ReflectionProvider } from '../providers/types.js'

export function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    port: 8787,
    supabaseUrl: null,
    supabaseServiceRoleKey: null,
    nimBaseUrl: 'https://integrate.api.nvidia.com/v1',
    nimApiKey: null,
    nimModel: 'meta/llama-3.3-70b-instruct',
    sarvamApiKey: null,
    sarvamBaseUrl: 'https://api.sarvam.ai',
    ...overrides,
  }
}

export function makeApp(deps: Partial<AppDeps> = {}) {
  const env = deps.env ?? makeEnv()
  const repo = deps.repo ?? createMemoryRepository()
  const app = buildApp({ env, repo, provider: deps.provider, log: deps.log })
  return { app, repo, env }
}

export const WS = { 'X-Dev-Workspace': 'dev' }

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
