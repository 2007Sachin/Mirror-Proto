import { z } from 'zod'

export const createInterviewSchema = z.object({
  role: z.string().trim().min(1).max(120),
  industry: z.string().trim().max(120).optional(),
  /** A practice can open on its own question (e.g. the Coach's note). */
  openingQuestion: z.string().trim().min(8).max(300).optional(),
  /** A realistic screening call. The route that builds its questions belongs to the screen feature. */
  kind: z.enum(['practice', 'screen']).optional(),
  targetId: z.string().uuid().optional(),
  timeCapMinutes: z.number().int().min(5).max(10).optional(),
  questionCount: z.number().int().min(5).max(8).optional(),
  /** Test-only plumbing: the screen feature replaces this with its own builder. */
  questions: z.array(z.string().trim().min(8).max(300).endsWith('?')).min(5).max(8).optional(),
})

export const addTurnSchema = z.object({
  questionIndex: z.number().int().min(0).max(11),
  answer: z.string().max(10000),
  transcriptSource: z.enum(['text', 'voice']).default('text'),
})

export const evidenceItemSchema = z.object({
  turnId: z.string().min(1),
  quote: z.string().min(1).max(200),
  observation: z.string().min(1).max(2000),
  competency: z.string().min(1).max(120),
})

export const reflectionOutputSchema = z.object({
  readinessLabel: z.enum(['emerging', 'solid', 'strong']),
  readinessRange: z.object({ low: z.number(), high: z.number() }).nullable(),
  evidence: z.array(evidenceItemSchema),
  focus: z.string().min(1).max(2000),
})

export const followUpOutputSchema = z.object({
  question: z.string().trim().min(8).max(500),
})

export type CreateInterviewBody = z.infer<typeof createInterviewSchema>
export type AddTurnBody = z.infer<typeof addTurnSchema>
export type ReflectionOutput = z.infer<typeof reflectionOutputSchema>
