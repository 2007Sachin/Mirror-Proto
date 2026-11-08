import { describe, expect, it } from 'vitest'
import { wavToPcm16kMono } from '../voice/tts/sarvamTts.js'

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
