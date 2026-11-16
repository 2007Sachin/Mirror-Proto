// The ONLY module feature code calls for the five new stores: answer attempts, stories, résumé claims,
// gap matches and the replay schedule. It uses the server routes when the server says it keeps them
// (`/capabilities` newData === 'server', i.e. memory mode) and this browser's localStorage otherwise.
// Same row shapes and ordering either way, so callers never care which one answered.

import { ApiError, request } from './api'

export type TranscriptSource = 'text' | 'voice'

export interface Capabilities {
  newData: 'server' | 'browser'
  screenLongCalls: boolean
}

export interface AnswerAttemptInput {
  interviewId: string | null
  questionIndex: number | null
  question: string
  attempt: number
  answer: string
  kind: 'retry' | 'explain'
  itemId?: string | null
  transcriptSource: TranscriptSource
}
export interface AnswerAttemptRow extends AnswerAttemptInput { id: string; workspaceId: string; createdAt: string }
export interface AnswerAttemptFilter { interviewId?: string; itemId?: string; kind?: AnswerAttemptInput['kind'] }

export interface StoryInput {
  title: string
  themes: string[]
  situation: string
  task: string
  action: string
  result: string
  quote: string | null
  question: string | null
  sourceInterviewId: string | null
  sourceTurnId: string | null
}
export interface StoryRow extends StoryInput { id: string; workspaceId: string; createdAt: string; updatedAt: string }

export interface ResumeClaimInput { quote: string; skills: string[]; hasNumber: boolean; vague: boolean }
export interface ResumeClaimRow extends ResumeClaimInput { id: string; workspaceId: string; createdAt: string }

export interface GapMatchInput {
  targetId: string
  skill: string
  area: string
  weight: 'core' | 'nice'
  status: 'covered' | 'partial' | 'gap'
  claimQuote: string | null
  note: string
  probeQuestion: string | null
  source: 'ai' | 'fallback'
}
export interface GapMatchRow extends GapMatchInput { id: string; workspaceId: string; createdAt: string }

export interface ReplayItemInput { itemId: string; dueAt: string; intervalDays: number; rung: number; lastResult: boolean | null }
export interface ReplayItemRow extends ReplayItemInput { id: string; workspaceId: string; updatedAt: string }

// ---- capabilities ----

let caps: Promise<Capabilities> | null = null

/** Cached. A failed lookup answers 'browser' for now and is retried on the next call. */
export function getCapabilities(): Promise<Capabilities> {
  caps ??= request<Capabilities>('/capabilities').catch(() => {
    caps = null
    return { newData: 'browser', screenLongCalls: false } as Capabilities
  })
  return caps
}

/** For tests: forget the cached capabilities. */
export function resetCapabilities(): void {
  caps = null
}

// ---- browser backend ----

const PREFIX = 'mirror.data.v1.'
let userId: string | null = null

/** Called once the session is known (null on sign-out). Browser data is keyed by user; with no user it stays in memory only. */
export function setUser(id: string | null): void {
  if (id !== userId) fallback.clear()
  userId = id
}
/** Per-user browser key for small bits of progress (null when nobody is signed in, so nothing is kept). */
export const userKey = (key: string): string | null => storageKey(key)
const storageKey = (key: string) => (userId ? `${PREFIX}${userId}.${key}` : null)
const memKey = (key: string) => `${userId ?? ''}|${key}`
const KEYS = ['attempts', 'stories', 'claims', 'matches', 'replay'] as const
type Key = (typeof KEYS)[number]
const LOCAL_WORKSPACE = 'local'

// Storage can be blocked (private windows); this copy keeps the session working when it is.
const fallback = new Map<string, string>()

function read<T>(key: Key): T[] {
  let raw: string | null = null
  const sk = storageKey(key)
  if (sk) try { raw = localStorage.getItem(sk) } catch { /* blocked */ }
  raw ??= fallback.get(memKey(key)) ?? null
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? (v as T[]) : []
  } catch { return [] }
}

function write<T>(key: Key, rows: T[]): void {
  const raw = JSON.stringify(rows)
  fallback.set(memKey(key), raw)
  const sk = storageKey(key)
  if (sk) try { localStorage.setItem(sk, raw) } catch { /* blocked: the in-memory copy still serves this session */ }
}

const now = () => new Date().toISOString()
const uuid = () => crypto.randomUUID()

async function serverKeepsData(): Promise<boolean> {
  return (await getCapabilities()).newData === 'server'
}

const json = (body: unknown) => ({ body: JSON.stringify(body) })

const notFoundAsNull = (err: unknown): null => {
  if (err instanceof ApiError && err.status === 404) return null
  throw err
}

// ---- answer attempts (oldest first) ----

export const answerAttempts = {
  async add(input: AnswerAttemptInput): Promise<AnswerAttemptRow> {
    if (await serverKeepsData()) return request<AnswerAttemptRow>('/replay/attempts', { method: 'POST', ...json(input) })
    const row: AnswerAttemptRow = { ...input, itemId: input.itemId ?? null, id: uuid(), workspaceId: LOCAL_WORKSPACE, createdAt: now() }
    write('attempts', [...read<AnswerAttemptRow>('attempts'), row])
    return row
  },
  async list(filter?: AnswerAttemptFilter): Promise<AnswerAttemptRow[]> {
    if (await serverKeepsData()) {
      const q = new URLSearchParams()
      if (filter?.interviewId) q.set('interviewId', filter.interviewId)
      if (filter?.itemId) q.set('itemId', filter.itemId)
      if (filter?.kind) q.set('kind', filter.kind)
      return request<AnswerAttemptRow[]>(`/replay/attempts${q.size ? `?${q}` : ''}`)
    }
    return read<AnswerAttemptRow>('attempts').filter(
      a => (!filter?.interviewId || a.interviewId === filter.interviewId) && (!filter?.itemId || a.itemId === filter.itemId) && (!filter?.kind || a.kind === filter.kind),
    )
  },
  async deleteAll(): Promise<void> {
    if (await serverKeepsData()) await request<null>('/replay/attempts', { method: 'DELETE' })
    else write('attempts', [])
  },
}

// ---- stories (newest first) ----

export const stories = {
  async create(input: StoryInput): Promise<StoryRow> {
    if (await serverKeepsData()) return request<StoryRow>('/stories', { method: 'POST', ...json(input) })
    const at = now()
    const row: StoryRow = { ...input, id: uuid(), workspaceId: LOCAL_WORKSPACE, createdAt: at, updatedAt: at }
    write('stories', [...read<StoryRow>('stories'), row])
    return row
  },
  async list(): Promise<StoryRow[]> {
    if (await serverKeepsData()) return request<StoryRow[]>('/stories')
    return read<StoryRow>('stories').reverse()
  },
  /** Null when there is no such story. */
  async get(id: string): Promise<StoryRow | null> {
    if (await serverKeepsData()) return request<StoryRow>(`/stories/${encodeURIComponent(id)}`).catch(notFoundAsNull)
    return read<StoryRow>('stories').find(s => s.id === id) ?? null
  },
  async update(id: string, patch: Partial<StoryInput>): Promise<StoryRow | null> {
    if (await serverKeepsData()) return request<StoryRow>(`/stories/${encodeURIComponent(id)}`, { method: 'PATCH', ...json(patch) }).catch(notFoundAsNull)
    const list = read<StoryRow>('stories')
    const i = list.findIndex(s => s.id === id)
    if (i < 0) return null
    list[i] = { ...list[i], ...patch, id, workspaceId: LOCAL_WORKSPACE, createdAt: list[i].createdAt, updatedAt: now() }
    write('stories', list)
    return list[i]
  },
  async remove(id: string): Promise<void> {
    if (await serverKeepsData()) await request<null>(`/stories/${encodeURIComponent(id)}`, { method: 'DELETE' })
    else write('stories', read<StoryRow>('stories').filter(s => s.id !== id))
  },
  async removeAll(): Promise<void> {
    if (await serverKeepsData()) await request<null>('/stories', { method: 'DELETE' })
    else write('stories', [])
  },
}

// ---- résumé claims ----

export const resumeClaims = {
  /** Replaces the whole set. */
  async replace(claims: ResumeClaimInput[]): Promise<ResumeClaimRow[]> {
    if (await serverKeepsData()) return request<ResumeClaimRow[]>('/resume/claims', { method: 'PUT', ...json({ claims }) })
    const rows = claims.map(c => ({ ...c, id: uuid(), workspaceId: LOCAL_WORKSPACE, createdAt: now() }))
    write('claims', rows)
    return rows
  },
  async list(): Promise<ResumeClaimRow[]> {
    if (await serverKeepsData()) return request<ResumeClaimRow[]>('/resume/claims')
    return read<ResumeClaimRow>('claims')
  },
}

// ---- gap matches (per target) ----

export const gapMatches = {
  /** Replaces this target's matches and leaves other targets alone. */
  async replace(targetId: string, rows: Omit<GapMatchInput, 'targetId'>[]): Promise<GapMatchRow[]> {
    if (await serverKeepsData()) {
      const out = await request<{ matches: GapMatchRow[] }>(`/targets/${encodeURIComponent(targetId)}/match`, { method: 'PUT', ...json({ matches: rows }) })
      return out.matches
    }
    const made = rows.map(m => ({ ...m, targetId, id: uuid(), workspaceId: LOCAL_WORKSPACE, createdAt: now() }))
    write('matches', [...read<GapMatchRow>('matches').filter(m => m.targetId !== targetId), ...made])
    return made
  },
  async list(targetId: string): Promise<GapMatchRow[]> {
    if (await serverKeepsData()) return (await request<{ matches: GapMatchRow[] }>(`/targets/${encodeURIComponent(targetId)}/match`)).matches
    return read<GapMatchRow>('matches').filter(m => m.targetId === targetId)
  },
}

// ---- replay schedule (a typed contract; the first scheduler is stateless) ----

export const replay = {
  /** One row per itemId. */
  async upsert(input: ReplayItemInput): Promise<ReplayItemRow> {
    if (await serverKeepsData()) return request<ReplayItemRow>('/practice/schedule', { method: 'PUT', ...json(input) })
    const list = read<ReplayItemRow>('replay')
    const i = list.findIndex(r => r.itemId === input.itemId)
    const row: ReplayItemRow = { ...input, id: i >= 0 ? list[i].id : uuid(), workspaceId: LOCAL_WORKSPACE, updatedAt: now() }
    if (i >= 0) list[i] = row
    else list.push(row)
    write('replay', list)
    return row
  },
  /** Soonest due first. */
  async list(): Promise<ReplayItemRow[]> {
    if (await serverKeepsData()) return request<ReplayItemRow[]>('/practice/schedule')
    return read<ReplayItemRow>('replay').sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  },
  async remove(itemId: string): Promise<void> {
    if (await serverKeepsData()) await request<null>(`/practice/schedule?itemId=${encodeURIComponent(itemId)}`, { method: 'DELETE' })
    else write('replay', read<ReplayItemRow>('replay').filter(r => r.itemId !== itemId))
  },
}

/** Reset: forgets this user's data in this browser and, when the server keeps the stores, there too. Never throws. */
export async function clearAll(): Promise<void> {
  for (const key of KEYS) {
    fallback.delete(memKey(key))
    const sk = storageKey(key)
    if (sk) try { localStorage.removeItem(sk) } catch { /* blocked */ }
  }
  try {
    if (await serverKeepsData()) await request<null>('/data', { method: 'DELETE' })
  } catch { /* the server may be down; the browser copy is already clear */ }
}
