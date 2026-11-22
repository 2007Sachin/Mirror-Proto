// ONE shared list of story themes (also used by server/routes/stories.ts to validate). Pure, no imports.
export interface Theme { id: string; name: string; re: RegExp }

export const THEMES: Theme[] = [
  { id: 'leadership', name: 'Leadership', re: /\b(led|lead|leading|managed|mentored|coached|ran the team|team lead|rallied|delegat\w*)\b/i },
  { id: 'conflict', name: 'Conflict', re: /\b(conflict|disagree\w*|argu\w*|tension|pushback|pushed back|clash\w*|heated)\b/i },
  { id: 'failure', name: 'Failure', re: /\b(fail\w*|missed|didn't work|did not work|fell short|went wrong|setback)\b/i },
  { id: 'ownership', name: 'Ownership', re: /\b(owned|ownership|took responsibility|took charge|on my own|end to end|stepped up|my call)\b/i },
  { id: 'ambiguity', name: 'Ambiguity', re: /\b(ambiguous|ambiguity|unclear|no clear|vague|uncertain\w*|unknown|figured out|undefined)\b/i },
  { id: 'influence', name: 'Influence', re: /\b(convinc\w*|persuad\w*|influenc\w*|buy-in|bought in|got agreement|won over|pitched)\b/i },
  { id: 'deadline-pressure', name: 'Deadline pressure', re: /\b(deadline|tight|under pressure|last minute|ahead of schedule|behind schedule|late|rush\w*|launch date)\b/i },
  { id: 'data-driven', name: 'Data-driven decision', re: /\b(data|metrics?|analy[sz]\w*|numbers|dashboard|experiment|a\/b|measured|query|queries)\b/i },
  { id: 'customer-focus', name: 'Customer focus', re: /\b(customers?|users?|clients?|support tickets?|feedback|complaints?)\b/i },
  { id: 'learning', name: 'Learning', re: /\b(learn\w*|taught myself|picked up|new to me|upskill\w*|study|studied|course)\b/i },
  { id: 'collaboration', name: 'Collaboration', re: /\b(collaborat\w*|together|teammates?|cross-functional|partnered|paired|worked with|we agreed)\b/i },
  { id: 'mistake-recovery', name: 'Mistake and recovery', re: /\b(mistake|my fault|my error|broke|rolled back|rollback|recover\w*|fixed it|apolog\w*|lesson)\b/i },
]

export const THEME_IDS: string[] = THEMES.map(t => t.id)
export const MAX_THEMES = THEMES.length

export const themeName = (id: string) => THEMES.find(t => t.id === id)?.name ?? id

/** Theme ids whose keywords appear in the text, in list order. */
export function themesFor(text: string): string[] {
  return THEMES.filter(t => t.re.test(text)).map(t => t.id)
}

/**
 * Theme ids with a confidence from 0 to 1, strongest first. It rises with the number of different keywords that match.
 * An internal ranking: never show it to the learner as a score. (`themesFor` stays a plain list of ids, because pages and the server rely on that.)
 */
export function themeConfidence(text: string): { themeId: string; confidence: number }[] {
  return THEMES
    .map(t => {
      const hits = [...text.matchAll(new RegExp(t.re.source, t.re.flags.includes('g') ? t.re.flags : `${t.re.flags}g`))].map(m => m[0].toLowerCase())
      const distinct = new Set(hits).size
      const confidence = hits.length === 0 ? 0 : Math.min(1, 0.4 + 0.2 * distinct + 0.05 * (hits.length - distinct))
      return { themeId: t.id, confidence: Math.round(confidence * 100) / 100 }
    })
    .filter(x => x.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence || THEME_IDS.indexOf(a.themeId) - THEME_IDS.indexOf(b.themeId))
}

export type ThemeContext = 'situation' | 'resolution'
export interface ThemeDetection { primary: string | null; secondary: string[]; context: ThemeContext | null }

/** The strongest theme, the others, and whether the strongest first shows up in the first or second half of the answer (the setup or the way it ended). */
export function detectThemes(answer: string): ThemeDetection {
  const text = answer ?? ''
  const ranked = themeConfidence(text)
  if (ranked.length === 0) return { primary: null, secondary: [], context: null }
  const primary = ranked[0].themeId
  const at = text.search(THEMES.find(t => t.id === primary)!.re)
  return { primary, secondary: ranked.slice(1).map(r => r.themeId), context: at < text.length / 2 ? 'situation' : 'resolution' }
}
