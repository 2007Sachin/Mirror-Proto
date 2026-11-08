import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('voice security contracts', () => {
  it('keeps Sarvam credentials on the server', () => {
    const clientFiles = [
      'src/voice/VoiceClient.ts',
      'src/voice/useVoiceSession.ts',
      'src/voice/protocol.ts',
      'src/App.tsx',
      'src/lib/api.ts',
    ]
    for (const rel of clientFiles) {
      const text = readFileSync(join(root, rel), 'utf8')
      expect(text).not.toMatch(/SARVAM_API_KEY/)
      expect(text).not.toMatch(/api\.sarvam\.ai/)
    }
  })

  it('does not persist raw audio in the repository contract', () => {
    const memory = readFileSync(join(root, 'server/repo/memory.ts'), 'utf8')
    const types = readFileSync(join(root, 'server/repo/types.ts'), 'utf8')
    expect(memory).not.toMatch(/audioBytes|pcm16|wav/)
    expect(types).not.toMatch(/audioBytes|rawAudio/)
  })
})
