import type { TtsProvider, TtsSynthesizeOpts } from '../providers/types.js'

export interface SarvamTtsDeps {
  apiKey: string
  baseUrl: string
  fetchImpl?: typeof fetch
  speaker?: string
  model?: string
}

/**
 * Parse a RIFF/WAVE buffer and extract PCM16 mono audio resampled (nearest
 * neighbour) to 16kHz. Returns null when the buffer is not a decodable WAV.
 */
export function wavToPcm16kMono(wav: Buffer): Buffer | null {
  if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
    return null
  }
  let offset = 12
  let fmt: { audioFormat: number; channels: number; sampleRate: number; bitsPerSample: number } | null = null
  let data: Buffer | null = null
  while (offset + 8 <= wav.length) {
    const id = wav.toString('ascii', offset, offset + 4)
    const size = wav.readUInt32LE(offset + 4)
    const bodyStart = offset + 8
    if (id === 'fmt ') {
      fmt = {
        audioFormat: wav.readUInt16LE(bodyStart),
        channels: wav.readUInt16LE(bodyStart + 2),
        sampleRate: wav.readUInt32LE(bodyStart + 4),
        bitsPerSample: wav.readUInt16LE(bodyStart + 14),
      }
    } else if (id === 'data') {
      data = wav.subarray(bodyStart, Math.min(bodyStart + size, wav.length))
    }
    offset = bodyStart + size + (size % 2)
  }
  if (!fmt || !data || fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) return null

  // De-interleave to mono if needed.
  const bytesPerFrame = 2 * fmt.channels
  const frameCount = Math.floor(data.length / bytesPerFrame)
  const mono = Buffer.alloc(frameCount * 2)
  for (let i = 0; i < frameCount; i++) {
    let acc = 0
    for (let ch = 0; ch < fmt.channels; ch++) {
      acc += data.readInt16LE(i * bytesPerFrame + ch * 2)
    }
    mono.writeInt16LE(Math.round(acc / fmt.channels), i * 2)
  }

  if (fmt.sampleRate === 16000) return mono
  if (fmt.sampleRate <= 0) return null
  const outFrames = Math.round((frameCount * 16000) / fmt.sampleRate)
  const out = Buffer.alloc(outFrames * 2)
  for (let i = 0; i < outFrames; i++) {
    const src = Math.min(frameCount - 1, Math.floor((i * fmt.sampleRate) / 16000))
    out.writeInt16LE(mono.readInt16LE(src * 2), i * 2)
  }
  return out
}

/**
 * Sarvam REST TTS: POST /text-to-speech, decode the returned WAV to PCM16
 * 16kHz mono and yield it in 640-byte (20ms) chunks.
 */
export function createSarvamTts(deps: SarvamTtsDeps): TtsProvider {
  const fetchImpl = deps.fetchImpl ?? fetch
  const speaker = deps.speaker ?? 'shubh'
  const model = deps.model ?? 'bulbul:v3'
  return {
    async *synthesizeStream(text: string, opts: TtsSynthesizeOpts): AsyncIterable<Buffer> {
      const res = await fetchImpl(`${deps.baseUrl}/text-to-speech`, {
        method: 'POST',
        headers: {
          'api-subscription-key': deps.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language_code: opts.language,
          speaker,
          model,
          pace: opts.speed,
          speech_sample_rate: 16000,
          output_audio_codec: 'wav',
        }),
      })
      if (!res.ok) throw new Error(`sarvam_tts_http_${res.status}`)
      const body = (await res.json()) as { audios?: string[] }
      const b64 = body.audios?.[0]
      if (!b64) throw new Error('sarvam_tts_empty')
      const wav = Buffer.from(b64, 'base64')
      const pcm = wavToPcm16kMono(wav)
      if (!pcm) throw new Error('sarvam_tts_bad_wav')
      for (let i = 0; i < pcm.length; i += 640) {
        yield pcm.subarray(i, Math.min(i + 640, pcm.length))
      }
    },
  }
}
