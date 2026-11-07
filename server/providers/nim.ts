import type { Env } from '../config.js'
import {
  FollowUpOutputSchema,
  ReflectionOutputSchema,
  type FollowUpRequest,
  type ProviderRequest,
  type ReflectionOutput,
} from './types.js'

export class ProviderFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderFailure'
  }
}

export type NimLog = (entry: { provider: 'nim'; operation: string; status?: number; latencyMs: number; attempt?: number }) => void

const REFLECTION_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'reflection',
    schema: {
      type: 'object',
      properties: {
        readinessLabel: { type: 'string', enum: ['emerging', 'solid', 'strong'] },
        readinessRange: {
          type: ['object', 'null'],
          properties: { low: { type: 'number' }, high: { type: 'number' } },
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

const FOLLOWUP_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'followup',
    schema: {
      type: 'object',
      properties: { question: { type: 'string' } },
      required: ['question'],
    },
  },
} as const

function reflectionMessages(request: ProviderRequest) {
  const transcript = request.turns
    .map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1} (id: ${t.id}): ${t.answer}`)
    .join('\n\n')
  return [
    {
      role: 'system',
      content:
        'You are MIRROR, an interview coach. Assess the candidate using ONLY the evidence in their answers. ' +
        'Every evidence item must quote an exact substring of one answer and reference that answer id as turnId. ' +
        'Never invent candidate experience. Never emit a numeric readiness range without at least one evidence item. ' +
        'Do not claim the reflection predicts hiring success. Keep evidence and readiness isolated to the target role.',
    },
    {
      role: 'user',
      content: `Target role: ${request.role}\n\nInterview transcript:\n${transcript}\n\nReturn the structured reflection.`,
    },
  ]
}

function followUpMessages(request: FollowUpRequest) {
  const transcript = request.turns
    .map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}`)
    .join('\n\n')
  return [
    {
      role: 'system',
      content:
        'You are MIRROR, an interview coach. Write the next interview question as a JSON object { "question": "..." }. ' +
        'The question must follow from the target role and the candidate’s previous answers. ' +
        'Do not invent facts about the candidate. Do not praise, score, or summarise. Ask exactly one question.',
    },
    {
      role: 'user',
      content:
        `Target role: ${request.role}\nIndustry: ${request.industry ?? 'unspecified'}\n` +
        `Next question number: ${request.nextIndex + 1} of 4\n\nSo far:\n${transcript}\n\nReturn the next question.`,
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

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500
}

async function chatWithRetries(
  env: Env,
  fetchImpl: typeof fetch,
  body: Record<string, unknown>,
  timeoutMs: number,
  retryDelayMs: number,
  maxAttempts: number,
  log: NimLog,
  operation: string,
): Promise<Response> {
  const started = Date.now()
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await postChatCompletions(env, fetchImpl, body, timeoutMs)
      if (response.ok || !isTransientStatus(response.status) || attempt === maxAttempts) {
        log({ provider: 'nim', operation, status: response.status, latencyMs: Date.now() - started, attempt })
        return response
      }
      lastError = new ProviderFailure(`provider responded with status ${response.status}`)
    } catch (err) {
      lastError = err
      if (attempt === maxAttempts) {
        log({ provider: 'nim', operation, latencyMs: Date.now() - started, attempt })
        throw new ProviderFailure(err instanceof Error ? err.message : 'provider request failed')
      }
    }
    if (retryDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt))
    }
  }
  throw lastError instanceof ProviderFailure
    ? lastError
    : new ProviderFailure(lastError instanceof Error ? lastError.message : 'provider request failed')
}

function extractJsonContent(payload: unknown): unknown {
  const text = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content
  if (typeof text !== 'string') {
    throw new ProviderFailure('provider response missing message content')
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new ProviderFailure('provider returned non-JSON message content')
  }
}

async function completeJson(
  env: Env,
  fetchImpl: typeof fetch,
  messages: unknown,
  format: unknown,
  timeoutMs: number,
  retryDelayMs: number,
  maxAttempts: number,
  log: NimLog,
  operation: string,
): Promise<unknown> {
  const baseBody = {
    model: env.nimModel,
    messages,
    temperature: 0.2,
  }
  let response = await chatWithRetries(
    env,
    fetchImpl,
    { ...baseBody, response_format: format },
    timeoutMs,
    retryDelayMs,
    maxAttempts,
    log,
    operation,
  )
  if (response.status === 400) {
    response = await chatWithRetries(
      env,
      fetchImpl,
      { ...baseBody, response_format: { type: 'json_object' } },
      timeoutMs,
      retryDelayMs,
      maxAttempts,
      log,
      `${operation}_json_object`,
    )
  }
  if (!response.ok) {
    throw new ProviderFailure(`provider responded with status ${response.status}`)
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ProviderFailure('provider returned invalid JSON')
  }
  return extractJsonContent(payload)
}

export function createNimClient(
  env: Env,
  fetchImpl: typeof fetch = fetch,
  log: NimLog = () => {},
  timeoutMs = 30_000,
  retryDelayMs = 150,
  maxAttempts = 3,
) {
  return {
    async generateFollowUp(request: FollowUpRequest): Promise<string> {
      const raw = await completeJson(
        env,
        fetchImpl,
        followUpMessages(request),
        FOLLOWUP_FORMAT,
        timeoutMs,
        retryDelayMs,
        maxAttempts,
        log,
        'followup',
      )
      const parsed = FollowUpOutputSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ProviderFailure('provider returned output that did not match the follow-up schema')
      }
      return parsed.data.question
    },

    async generateReflection(request: ProviderRequest): Promise<ReflectionOutput> {
      const raw = await completeJson(
        env,
        fetchImpl,
        reflectionMessages(request),
        REFLECTION_FORMAT,
        timeoutMs,
        retryDelayMs,
        maxAttempts,
        log,
        'reflection',
      )
      const parsed = ReflectionOutputSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ProviderFailure('provider returned output that did not match the reflection schema')
      }
      return parsed.data
    },
  }
}

export type NimClient = ReturnType<typeof createNimClient>
