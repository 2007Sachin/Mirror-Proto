import { env } from '../config.js'
import { createSarvamTts } from '../voice/tts/sarvamTts.js'
import { createSarvamRealtimeStt } from '../voice/stt/sarvamRealtimeStt.js'

const PHRASE = 'onboarding redesign'

async function tts(text: string): Promise<Buffer> {
  const chunks: Buffer[] = []
  const p = createSarvamTts({
    apiKey: env.sarvamApiKey!,
    baseUrl: env.sarvamBaseUrl,
    speaker: env.sarvamSpeaker,
    model: env.sarvamTtsModel,
  })
  for await (const c of p.synthesizeStream(text, { language: env.sarvamLanguage, speed: 1 })) {
    chunks.push(Buffer.from(c))
  }
  return Buffer.concat(chunks)
}

async function main() {
  const spoken = await tts(`I led a messy ${PHRASE} after a product update.`)
  const copies = Math.ceil(32 / (spoken.length / 32000))
  const longPcm = Buffer.concat(Array.from({ length: copies }, () => spoken))
  const started = Date.now()
  const partials: number[] = []
  const stt = createSarvamRealtimeStt({
    apiKey: env.sarvamApiKey!,
    realtimeUrl: env.sarvamSttRealtimeUrl,
    model: env.sarvamSttRealtimeModel,
    language: env.sarvamLanguage,
    endpointing: 'manual',
    finalizeTimeoutMs: 25000,
  })
  const stream = stt.startStream({ language: env.sarvamLanguage, sampleRate: 16000 })
  stream.onPartial(() => partials.push(Date.now() - started))
  await new Promise(r => setTimeout(r, 600))
  for (let i = 0; i < longPcm.length; i += 640) {
    stream.sendAudio(longPcm.subarray(i, Math.min(i + 640, longPcm.length)))
    if (i % (640 * 15) === 0) await new Promise(r => setTimeout(r, 10))
  }
  let text = ''
  let error: string | null = null
  try {
    text = await stream.finalize()
  } catch (err) {
    error = err instanceof Error ? err.message : 'unknown'
  }
  stream.abort()
  console.log(
    JSON.stringify({
      spokenBytes: spoken.length,
      longSeconds: Number((longPcm.length / 32000).toFixed(2)),
      copies,
      error,
      partialCount: partials.length,
      firstPartialMs: partials[0] ?? null,
      elapsedMs: Date.now() - started,
      finalChars: text.trim().length,
      hasOnboarding: text.toLowerCase().includes('onboarding'),
      rest422: Boolean(error && error.includes('422')),
    }),
  )
  if (error || longPcm.length / 32000 <= 30 || !partials.length || !text.toLowerCase().includes('onboarding')) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('LIVE REALTIME STT FAIL', err instanceof Error ? err.message : 'unknown')
  process.exit(1)
})
