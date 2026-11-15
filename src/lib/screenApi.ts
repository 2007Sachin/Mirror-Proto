import { request, type InterviewSession } from './api'

/** Start a realistic screening call built from a target. The server builds the questions and keeps the clock. */
export const createScreen = (role: string, targetId: string, opts: { timeCapMinutes?: number; questionCount?: number } = {}) =>
  request<InterviewSession>('/interviews', { method: 'POST', body: JSON.stringify({ role, kind: 'screen', targetId, timeCapMinutes: opts.timeCapMinutes ?? 8, questionCount: opts.questionCount ?? 6 }) })
