import { extractText, getDocumentProxy } from 'unpdf'
import { z } from 'zod'
import { OPENING_QUESTION } from './questions.js'
import { ProviderFailure } from '../providers/nim.js'
import type { OnboardingRequest, ReflectionProvider } from '../providers/types.js'

export const MAX_RESUME_BYTES = 5 * 1024 * 1024
const MAX_RESUME_CHARS = 12_000

const long = (max: number) => z.string().trim().min(1).max(max)
const resumeText = z.string().max(20_000).optional()

export const onboardingStepSchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal('opening'), resume: long(20_000) }),
  z.object({ step: z.literal('pressure'), story: long(5000), resume: resumeText }),
  z.object({ step: z.literal('contract'), story: long(5000), question: long(500), answer: long(5000), resume: resumeText }),
])

export const profileSchema = z.object({
  role: long(120),
  story: long(5000),
  pressureQuestion: long(500),
  pressureAnswer: long(5000),
  summary: long(800),
  focus: long(300),
  firstQuestion: z.string().trim().min(8).max(500),
  resumeText: z.string().max(20_000).nullable(),
  resumeName: z.string().trim().max(200).nullable().default(null),
  mode: z.enum(['text', 'voice']),
})

/** Plain text from a PDF, or null when it isn't a readable PDF. Lightweight on purpose: the model reads the text. */
export async function extractResumeText(bytes: Uint8Array): Promise<string | null> {
  if (bytes.length > MAX_RESUME_BYTES || String.fromCharCode(...bytes.slice(0, 4)) !== '%PDF') return null
  try {
    const pdf = await getDocumentProxy(bytes)
    if (pdf.numPages > 30) return null // a resume, not a book
    const { text } = await extractText(pdf, { mergePages: true })
    return text.replace(/\s+/g, ' ').trim().slice(0, MAX_RESUME_CHARS)
  } catch {
    return null
  }
}

const firstSentence = (text: string) => {
  const one = text.trim().split(/(?<=[.!?])\s/)[0]
  return one.length > 140 ? `${one.slice(0, 137).trimEnd()}…` : one
}

/** Used when no provider is configured or it fails: honest, built only from the user's own words. */
function fallback(req: OnboardingRequest): Record<string, string> {
  switch (req.step) {
    case 'opening':
      return { text: 'I’ve read your resume. Pick the one piece of work on it you’d defend hardest, and tell me that story.' }
    case 'pressure':
      return { question: `You said: “${firstSentence(req.story)}” What actually went wrong, and how did you handle the people involved?` }
    case 'contract':
      return {
        summary: `Here’s what I heard: “${firstSentence(req.story)}” When I pushed, you said: “${firstSentence(req.answer)}”`,
        gap: 'saying what you personally did, in one clear sentence',
        role: 'Interview practice',
        firstQuestion: OPENING_QUESTION,
      }
    case 'coach':
      return {
        observation:
          (req.inProgress ? 'You have an interview open. Finish it when you’re ready. ' : '') +
          `You chose to work on ${req.focus} first. The next practice stays on that, using a story you’ve already told.`,
        nextPractice: `Spend ten minutes on ${req.focus}, starting from the same story.`,
        practiceQuestion: OPENING_QUESTION,
      }
    case 'planner': {
      const sql = req.rounds.find(r => r.title.startsWith('SQL') && r.available)
      return {
        nextStep: req.keepWorkingOn
          ? `Run the SQL round again with this in mind: ${req.keepWorkingOn}`
          : sql
            ? `Start with the SQL round: ${req.skills.slice(0, 3).join(', ') || 'SQL'} came up in the ${req.role} job description at ${req.company}.`
            : `Start with the behavioural round: it is the first round you can run today for ${req.role} at ${req.company}.`,
      }
    }
    case 'sqlFollowUp': {
      const q = req.query
      const ask = /\bjoin\b/i.test(q)
        ? 'Why did you choose that kind of JOIN, and what would change in the rows if you chose a different one?'
        : /\bgroup\s+by\b/i.test(q)
          ? 'Why did you group the rows the way you did, and what would you lose if you grouped differently?'
          : /\bover\s*\(/i.test(q)
            ? 'Why did you reach for a window function here, and how would you do it without one?'
            : /\(\s*select\b/i.test(q)
              ? 'Why did you put part of this in a subquery, and could it be written another way?'
              : 'Walk me through how you decided what this query should return, step by step?'
      return { question: ask }
    }
    case 'sqlDebrief': {
      const solved = req.attempts.filter(a => a.passed).length
      const total = req.attempts.length
      const used = [
        [/\bjoin\b/i, 'joins'],
        [/\bgroup\s+by\b/i, 'grouping'],
        [/\bover\s*\(/i, 'window functions'],
        [/\(\s*select\b/i, 'subqueries'],
      ].filter(([re]) => req.attempts.some(a => (re as RegExp).test(a.query))).map(([, name]) => name as string)
      const open = req.attempts.find(a => !a.passed)
      return {
        wentWell:
          (solved > 0 ? `You solved ${solved} of the ${total} problems you tried` : `You tried ${total} problem${total === 1 ? '' : 's'} and wrote a query for each`) +
          (used.length ? `, using ${used.join(' and ')}.` : '.'),
        keepWorkingOn: open ? `Getting “${open.title}” to return the right rows.` : 'Explaining out loud why you chose each approach.',
        suggestion: open
          ? 'Next time, read the problem once more before you write the query, then check the rows it returns against what was asked.'
          : 'Next time, say out loud why you chose each join or grouping before you run the query.',
      }
    }
  }
}

/** One moment of The First Interview. The flow never dead-ends: a provider failure falls back. */
export async function runOnboardingStep(
  provider: ReflectionProvider | null,
  req: OnboardingRequest,
): Promise<Record<string, string>> {
  if (!provider?.generateOnboarding) return fallback(req)
  try {
    return await provider.generateOnboarding(req)
  } catch (err) {
    if (err instanceof ProviderFailure) return fallback(req)
    throw err
  }
}
