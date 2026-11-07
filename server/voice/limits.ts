/**
 * Wire-format and resource limits for the voice gateway. Anything exceeding
 * these is a protocol violation and closes the connection.
 */
export const VOICE_LIMITS = {
  /** Max JSON control-frame size (bytes). */
  maxJsonBytes: 16 * 1024,
  /** Max binary (PCM) frame size (bytes). One 20ms/640B capture chunk is expected. */
  maxBinaryBytes: 8 * 1024,
  /** Max accumulated audio per turn before finalize is forced. */
  maxTurnAudioMs: 5 * 60 * 1000,
  /** Max session lifetime. */
  maxSessionMs: 30 * 60 * 1000,
  /** Client ping interval expectation; server treats silence > this * 3 as dead. */
  clientPingMs: 10 * 1000,
  /** Server-side silence timeout (idle, awaiting client messages). */
  serverSilenceMs: 30 * 1000,
  /** Silence timeout while the server is streaming TTS (client may be busy). */
  serverSilenceWhileSpeakingMs: 60 * 1000,
  /** Reconnect window: a tombstoned session can be resumed within this time. */
  reconnectWindowMs: 60 * 1000,
  /** Per-IP hello rate limit. */
  helloRateLimitMs: 5 * 1000,
} as const
