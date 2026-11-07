import { z } from 'zod'

export const createInterviewSchema = z.object({
  role: z.string().trim().min(1).max(120),
  industry: z.string().trim().max(120).optional(),
})

export const addTurnSchema = z.object({
  questionIndex: z.number().int().min(0).max(3),
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
