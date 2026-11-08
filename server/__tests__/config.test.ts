import { afterEach, describe, expect, it, vi } from 'vitest'

describe('server/config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('applies documented defaults', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SECRET_KEY', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    vi.stubEnv('NVIDIA_NIM_API_KEY', '')
    vi.stubEnv('NIM_API_KEY', '')
    vi.resetModules()
    const { env } = await import('../config.js')
    expect(env.port).toBe(8787)
    expect(env.nimBaseUrl).toBe('https://integrate.api.nvidia.com/v1')
    expect(env.nimModel).toBe('nvidia/nemotron-3.5-bolt-e4b')
    expect(env.supabaseUrl).toBeNull()
    expect(env.nimApiKey).toBeNull()
    expect(env.supabaseSecretKey).toBeNull()
  })

  it('reads NVIDIA_NIM_API_KEY, NVIDIA_NIM_BASE_URL, and NVIDIA_NIM_MODEL', async () => {
    vi.stubEnv('NVIDIA_NIM_API_KEY', 'nvidia-key')
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://integrate.api.nvidia.com/v1')
    vi.stubEnv('NVIDIA_NIM_MODEL', 'nvidia/nemotron-3.5-bolt-e4b')
    vi.resetModules()
    const { env } = await import('../config.js')
    expect(env.nimApiKey).toBe('nvidia-key')
    expect(env.nimModel).toBe('nvidia/nemotron-3.5-bolt-e4b')
  })

  it('treats blank secret values as unset', async () => {
    vi.stubEnv('SUPABASE_URL', '   ')
    vi.stubEnv('SUPABASE_SECRET_KEY', '   ')
    vi.stubEnv('NVIDIA_NIM_API_KEY', '   ')
    vi.resetModules()
    const { env, isSupabaseConfigured, isNimConfigured } = await import('../config.js')
    expect(env.supabaseUrl).toBeNull()
    expect(env.supabaseSecretKey).toBeNull()
    expect(env.nimApiKey).toBeNull()
    expect(isSupabaseConfigured(env)).toBe(false)
    expect(isNimConfigured(env)).toBe(false)
  })

  it('reads SUPABASE_SECRET_KEY', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'secret-role')
    vi.resetModules()
    const { env, isSupabaseConfigured } = await import('../config.js')
    expect(env.supabaseSecretKey).toBe('secret-role')
    expect(isSupabaseConfigured(env)).toBe(true)
  })

  it('a malformed NVIDIA_NIM_BASE_URL fails startup naming the key, not the value', async () => {
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'not a url at all ://')
    vi.resetModules()
    await expect(import('../config.js')).rejects.toThrow(/NVIDIA_NIM_BASE_URL/)
    await expect(import('../config.js')).rejects.toThrow(/key/)
    try {
      await import('../config.js')
    } catch (err) {
      expect(String(err)).not.toContain('not a url at all')
    }
  })
})
