import { describe, expect, it, vi } from 'vitest'
import { createSarvamStt, pcm16kMonoToWav } from '../voice/stt/sarvamStt.js'

describe('pcm16kMonoToWav', () => {
  it('wraps PCM16 as a RIFF WAVE container', () => {
    const pcm = Buffer.alloc(4)
    pcm.writeInt16LE(100, 0)
    const wav = pcm16kMonoToWav(pcm)
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.readUInt32LE(24)).toBe(16000)
    expect(wav.readUInt16LE(22)).toBe(1)
  })
})

describe('createSarvamStt', () => {
  it('posts WAV audio to /speech-to-text with subscription header and returns a transcript once', async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toBe('https://api.sarvam.ai/speech-to-text')
      const headers = init?.headers as Record<string, string>
      expect(headers['api-subscription-key']).toBe('test-key')
      expect(headers['X-API-Key']).toBeUndefined()
      const form = init?.body as FormData
      expect(form.get('model')).toBe('saaras:v4')
      expect(form.get('mode')).toBe('transcribe')
      expect(form.get('language_code')).toBe('en-IN')
      expect(form.get('file')).toBeInstanceOf(Blob)
      return new Response(JSON.stringify({ transcript: 'onboarding redesign' }), { status: 200 })
    }) as unknown as typeof fetch

    const stt = createSarvamStt({
      apiKey: 'test-key',
      baseUrl: 'https://api.sarvam.ai',
      fetchImpl,
    })
    const stream = stt.startStream({ language: 'en-IN', sampleRate: 16000 })
    stream.sendAudio(Buffer.alloc(640))
    const first = await stream.finalize()
    expect(first).toBe('onboarding redesign')
    await expect(stream.finalize()).rejects.toThrow('already_finalized')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns a controlled empty transcript when the provider sends none', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })) as unknown as typeof fetch
    const stream = createSarvamStt({
      apiKey: 'test-key',
      baseUrl: 'https://api.sarvam.ai',
      fetchImpl,
    }).startStream({ language: 'en-IN', sampleRate: 16000 })
    expect(await stream.finalize()).toBe('')
  })

  it('surfaces abort as a recoverable stream error', async () => {
    const stream = createSarvamStt({
      apiKey: 'test-key',
      baseUrl: 'https://api.sarvam.ai',
      fetchImpl: vi.fn() as unknown as typeof fetch,
    }).startStream({ language: 'en-IN', sampleRate: 16000 })
    stream.abort()
    await expect(stream.finalize()).rejects.toThrow('stream_aborted')
  })
})
