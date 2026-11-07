import { z } from 'zod'

export const ReflectionOutputSchema = z.object({
  readinessLabel: z.enum(['emerging', 'solid', 'strong']),
  readinessRange: z.object({ low: z.number(), high: z.number() }).nullable(),
  evidence: z.array(
    z.object({
      turnId: z.string().min(1),
      quote: z.string().min(1).max(200),
      observation: z.string().min(1).max(2000),
      competency: z.string().min(1).max(120),
    }),
  ),
  focus: z.string().min(1).max(2000),
})

export const FollowUpOutputSchema = z.object({
  question: z.string().trim().min(8).max(500),
})

export type ReflectionOutput = z.infer<typeof ReflectionOutputSchema>
export type FollowUpOutput = z.infer<typeof FollowUpOutputSchema>

export interface ProviderRequest {
  role: string
  questions: string[]
  turns: { id: string; question: string; answer: string }[]
}

export interface FollowUpRequest {
  role: string
  industry: string | null
  turns: { question: string; answer: string }[]
  nextIndex: number
}

export interface ReflectionProvider {
  generateReflection(request: ProviderRequest): Promise<ReflectionOutput>
  generateFollowUp?(request: FollowUpRequest): Promise<string>
}
