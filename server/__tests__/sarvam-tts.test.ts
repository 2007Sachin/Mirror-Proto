import { describe, expect, it, vi } from 'vitest'
import { createSarvamTts, wavToPcm16kMono } from '../voice/tts/sarvamTts.js'

function pcm16Wav(samples: number[], sampleRate = 16000): Buffer {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((s, i) => data.writeInt16LE(s, i * 2))
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

describe('wavToPcm16kMono', () => {
  it('extracts PCM16 16 kHz mono frames', () => {
    const wav = pcm16Wav([0, 1000, -1000, 0])
    const pcm = wavToPcm16kMono(wav)
    expect(pcm?.length).toBe(8)
    expect(pcm?.readInt16LE(2)).toBe(1000)
  })

  it('rejects non-wav buffers', () => {
    expect(wavToPcm16kMono(Buffer.from('not-audio'))).toBeNull()
  })
})

describe('createSarvamTts', () => {
  it('posts current Sarvam TTS fields and yields PCM chunks', async () => {
    const wav = pcm16Wav([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31])
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toBe('https://api.sarvam.ai/text-to-speech')
      const headers = init?.headers as Record<string, string>
      expect(headers['api-subscription-key']).toBe('test-key')
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body.text).toBe('Tell me about a project you are proud of.')
      expect(body.language_code).toBe('en-IN')
      expect(body.speaker).toBe('shubh')
      expect(body.model).toBe('bulbul:v3')
      expect(body.speech_sample_rate).toBe(16000)
      expect(body.output_audio_codec).toBe('wav')
      expect(body.input).toBeUndefined()
      return new Response(JSON.stringify({ audios: [wav.toString('base64')] }), { status: 200 })
    }) as unknown as typeof fetch

    const tts = createSarvamTts({
      apiKey: 'test-key',
      baseUrl: 'https://api.sarvam.ai',
      fetchImpl,
    })
    const chunks: Buffer[] = []
    for await (const chunk of tts.synthesizeStream('Tell me about a project you are proud of.', { language: 'en-IN', speed: 1 })) {
      chunks.push(chunk)
    }
    expect(chunks.length).toBeGreaterThan(0)
    expect(Buffer.concat(chunks).length).toBeGreaterThan(0)
  })
})
