// Test-only helpers: a fake WebSocket that plays the part of the MIRROR voice gateway.
import { PROTOCOL_VERSION } from './protocol'

export class FakeWebSocket {
  static OPEN = 1
  static CLOSED = 3
  static instances: FakeWebSocket[] = []
  readyState = 0
  binaryType = 'blob'
  sent: (string | ArrayBuffer | ArrayBufferView)[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  private serverSeq = 0

  url: string

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
    queueMicrotask(() => {
      this.readyState = FakeWebSocket.OPEN
      this.onopen?.()
    })
  }

  send(data: string | ArrayBuffer | ArrayBufferView) {
    this.sent.push(data)
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.()
  }

  /** The server sends one JSON envelope. */
  serverSend(type: string, payload: unknown, turnId: string | null = null, sessionId: string | null = 's1') {
    this.onmessage?.({
      data: JSON.stringify({ v: PROTOCOL_VERSION, type, sessionId, turnId, seq: this.serverSeq++, ts: Date.now(), payload }),
    })
  }

  /** The server sends one binary TTS frame. */
  serverAudio() {
    this.onmessage?.({ data: new ArrayBuffer(640) })
  }

  /** Types of the JSON envelopes the client has sent, in order. */
  sentTypes(): string[] {
    return this.sent.filter((s): s is string => typeof s === 'string').map(s => (JSON.parse(s) as { type: string }).type)
  }

  sentEnvelopes(type: string): { turnId: string | null; payload: unknown }[] {
    return this.sent
      .filter((s): s is string => typeof s === 'string')
      .map(s => JSON.parse(s) as { type: string; turnId: string | null; payload: unknown })
      .filter(e => e.type === type)
  }
}

/** Server messages for one spoken question: question, tts_start, audio, tts_end. */
export function speakQuestion(ws: FakeWebSocket, turnId: string, text: string, questionIndex: number) {
  ws.serverSend('state', { state: 'speaking', turnId }, turnId)
  ws.serverSend('question', { turnId, text, questionIndex }, turnId)
  ws.serverSend('tts_start', { turnId }, turnId)
  ws.serverAudio()
  ws.serverSend('tts_end', { turnId }, turnId)
}
