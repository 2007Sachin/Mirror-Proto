import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { testAuth } from '../auth/testAuth.js'
import { createMemoryRepository } from '../repo/memory.js'
import { createVoiceGateway } from '../voice/gateway.js'
import { makeEnv } from './helpers.js'

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
      expect(text).not.toMatch(/api-subscription-key/)
    }
  })

  it('does not persist raw audio in the repository contract', () => {
    const memory = readFileSync(join(root, 'server/repo/memory.ts'), 'utf8')
    const types = readFileSync(join(root, 'server/repo/types.ts'), 'utf8')
    expect(memory).not.toMatch(/audioBytes|pcm16|wav/)
    expect(types).not.toMatch(/audioBytes|rawAudio/)
  })
})

describe('voice upgrade gate', () => {
  async function start() {
    const http = createServer()
    const gateway = createVoiceGateway({ env: makeEnv(), auth: testAuth(), repoFor: () => createMemoryRepository(), provider: null })
    gateway.attach(http)
    await new Promise<void>(r => http.listen(0, '127.0.0.1', r))
    return { http, gateway, port: (http.address() as AddressInfo).port }
  }
  async function connect(port: number, headers: Record<string, string>) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/voice`, { headers })
    const out = await new Promise<string>(resolve => {
      ws.on('open', () => resolve('open'))
      ws.on('unexpected-response', (_r, res) => resolve(`http ${res.statusCode}`))
      ws.on('error', () => undefined)
    })
    ws.terminate()
    return out
  }

  it('403 for a foreign or missing Origin, 401 without a session, upgrades with both', async () => {
    const { http, gateway, port } = await start()
    try {
      expect(await connect(port, { origin: 'https://evil.example', 'x-test-user': 'ann' })).toBe('http 403')
      expect(await connect(port, { 'x-test-user': 'ann' })).toBe('http 403')
      expect(await connect(port, { origin: 'http://localhost:3000' })).toBe('http 401')
      expect(await connect(port, { origin: 'http://localhost:3000', 'x-test-user': 'ann' })).toBe('open')
    } finally {
      gateway.close()
      http.close()
    }
  })

  it('does not destroy non-loopback peers (reaches auth) unless VOICE_LOCAL_ONLY=1', async () => {
    for (const voiceLocalOnly of [false, true]) {
      const http = createServer()
      let authCalled = false
      const auth = { ...testAuth(), fromUpgrade: async () => { authCalled = true; return null } }
      const gateway = createVoiceGateway({ env: makeEnv({ voiceLocalOnly }), auth, repoFor: () => createMemoryRepository(), provider: null })
      gateway.attach(http)
      let destroyed = false
      let ended = ''
      const socket = { destroy: () => { destroyed = true }, end: (m: string) => { ended = m } }
      const req = { url: '/ws/voice', headers: { origin: 'http://localhost:3000', host: 'localhost:3000' }, socket: { remoteAddress: '203.0.113.9' } }
      http.emit('upgrade', req, socket, Buffer.alloc(0))
      await new Promise(r => setTimeout(r, 20))
      expect(destroyed).toBe(voiceLocalOnly)
      expect(authCalled).toBe(!voiceLocalOnly)
      expect(ended.startsWith('HTTP/1.1 401')).toBe(!voiceLocalOnly)
      gateway.close()
    }
  })
})
