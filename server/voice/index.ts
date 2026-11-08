import type { Server as HttpServer } from 'node:http'
import type { Env } from '../config.js'
import type { Repository } from '../repo/types.js'
import { createVoiceGateway, type VoiceGateway, type VoiceGatewayDeps } from './gateway.js'
import type { SttProvider } from './providers/types.js'
import type { TtsProvider } from './providers/types.js'

export interface VoiceRouteDeps {
  env: Env
  repo: Repository
  /** Test hooks: inject mock providers and capture logs. */
  stt?: SttProvider
  tts?: TtsProvider
  provider?: import('../providers/types.js').ReflectionProvider | null
  log?: (msg: string) => void
}

/**
 * Registers the voice gateway on the existing node HTTP server. Phase-1 REST
 * routes are untouched; /ws/voice is the only WS path.
 */
export function attachVoiceGateway(server: HttpServer, deps: VoiceRouteDeps): VoiceGateway {
  const gateway = createVoiceGateway(deps satisfies VoiceGatewayDeps)
  gateway.attach(server)
  return gateway
}

export { createVoiceGateway }
export type { VoiceGateway }
