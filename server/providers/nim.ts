import type { Env } from '../config.js'
import { ReflectionOutputSchema, type ProviderRequest, type ReflectionOutput } from './types.js'

export class ProviderFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderFailure'
  }
}

export type NimLog = (entry: { provider: 'nim'; status?: number; latencyMs: number }) => void

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'reflection',
    schema: {
      type: 'object',
      properties: {
        readinessLabel: { type: 'string', enum: ['emerging', 'solid', 'strong'] },
        readinessRange: {
          type: ['object', 'null'],
          properties: {
            low: { type: 'number' },
            high: { type: 'number' },
          },
          required: ['low', 'high'],
        },
        evidence: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              turnId: { type: 'string' },
              quote: { type: 'string', maxLength: 200 },
              observation: { type: 'string' },
              competency: { type: 'string' },
            },
            required: ['turnId', 'quote', 'observation', 'competency'],
          },
        },
        focus: { type: 'string' },
      },
      required: ['readinessLabel', 'readinessRange', 'evidence', 'focus'],
    },
  },
} as const

function buildMessages(request: ProviderRequest) {
  const transcript = request.turns
    .map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1} (id: ${t.id}): ${t.answer}`)
    .join('\n\n')
  return [
    {
      role: 'system',
      content:
        'You are MIRROR, an interview coach. Assess the candidate using ONLY the evidence in their answers. ' +
        'Every evidence item must quote an exact substring of one answer and reference that answer id as turnId. ' +
        'Never emit a numeric readiness range without at least one evidence item.',
    },
    {
      role: 'user',
      content: `Target role: ${request.role}\n\nInterview transcript:\n${transcript}\n\nReturn the structured reflection.`,
    },
  ]
}

async function postChatCompletions(
  env: Env,
  fetchImpl: typeof fetch,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(`${env.nimBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.nimApiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

function parseCompletion(raw: unknown): ReflectionOutput {
  const parsed = ReflectionOutputSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ProviderFailure('provider returned output that did not match the reflection schema')
  }
  return parsed.data
}

/**
 * NVIDIA NIM client. All failures (non-2xx, timeout, bad JSON, schema
 * mismatch) surface as ProviderFailure so the app can map them to a safe 502.
 * Logs carry timing/status metadata only — never prompts or answers.
 */
export function createNimClient(
  env: Env,
  fetchImpl: typeof fetch = fetch,
  log: NimLog = () => {},
  timeoutMs = 30_000,
) {
  return {
    async generateReflection(request: ProviderRequest): Promise<ReflectionOutput> {
      const started = Date.now()
      const baseBody = {
        model: env.nimModel,
        messages: buildMessages(request),
        temperature: 0.2,
      }
      let response: Response
      try {
        response = await postChatCompletions(env, fetchImpl, { ...baseBody, response_format: RESPONSE_FORMAT }, timeoutMs)
      } catch (err) {
        log({ provider: 'nim', latencyMs: Date.now() - started })
        throw new ProviderFailure(err instanceof Error ? err.message : 'provider request failed')
      }
      if (response.status === 400) {
        // Some NIM deployments reject json_schema; retry with plain JSON mode.
        try {
          response = await postChatCompletions(env, fetchImpl, { ...baseBody, response_format: { type: 'json_object' } }, timeoutMs)
        } catch (err) {
          log({ provider: 'nim', latencyMs: Date.now() - started })
          throw new ProviderFailure(err instanceof Error ? err.message : 'provider request failed')
        }
      }
      log({ provider: 'nim', status: response.status, latencyMs: Date.now() - started })
      if (!response.ok) {
        throw new ProviderFailure(`provider responded with status ${response.status}`)
      }
      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new ProviderFailure('provider returned invalid JSON')
      }
      const text = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content
      if (typeof text !== 'string') {
        throw new ProviderFailure('provider response missing message content')
      }
      let raw: unknown
      try {
        raw = JSON.parse(text)
      } catch {
        throw new ProviderFailure('provider returned non-JSON message content')
      }
      return parseCompletion(raw)
    },
  }
}

export type NimClient = ReturnType<typeof createNimClient>
