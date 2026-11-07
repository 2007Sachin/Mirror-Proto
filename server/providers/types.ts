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

export type ReflectionOutput = z.infer<typeof ReflectionOutputSchema>

export interface ProviderRequest {
  role: string
  questions: string[]
  turns: { id: string; question: string; answer: string }[]
}

export interface ReflectionProvider {
  generateReflection(request: ProviderRequest): Promise<ReflectionOutput>
}
