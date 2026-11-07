import { afterEach, describe, expect, it, vi } from 'vitest'

describe('server/config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('applies documented defaults', async () => {
    vi.resetModules()
    const { env } = await import('../config.js')
    expect(env.port).toBe(8787)
    expect(env.nimBaseUrl).toBe('https://integrate.api.nvidia.com/v1')
    expect(env.nimModel).toBe('meta/llama-3.3-70b-instruct')
    expect(env.supabaseUrl).toBeNull()
    expect(env.nimApiKey).toBeNull()
  })

  it('reads NVIDIA_NIM_API_KEY per SETUP-INFRA.md and NIM_API_KEY as alias', async () => {
    vi.stubEnv('NVIDIA_NIM_API_KEY', 'nvidia-key')
    vi.resetModules()
    const { env } = await import('../config.js')
    expect(env.nimApiKey).toBe('nvidia-key')
  })

  it('a malformed NIM_BASE_URL fails startup naming the key, not the value', async () => {
    vi.stubEnv('NIM_BASE_URL', 'not a url at all ://')
    vi.resetModules()
    await expect(import('../config.js')).rejects.toThrow(/NIM_BASE_URL/)
    await expect(import('../config.js')).rejects.toThrow(/key/)
  })
})
