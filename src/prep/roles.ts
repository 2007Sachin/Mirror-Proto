// The role guides in docs/research/*-interview-prep.md, bundled as text and parsed once. Nothing is fetched, so the room works offline and in demo mode.
// Adding a role: add the markdown file (same headings) and one line to ROLE_FILES.
import pm from '../../docs/research/pm-interview-prep.md?raw'
import data from '../../docs/research/data-analytics-interview-prep.md?raw'
import finance from '../../docs/research/financial-analyst-interview-prep.md?raw'
import marketing from '../../docs/research/digital-marketing-interview-prep.md?raw'

export type PrepRound = { name: string; tests: string; questions: string[] }
export type PrepRole = { slug: string; title: string; overview: string; rounds: PrepRound[] }

const ROLE_FILES: { slug: string; title: string; text: string }[] = [
  { slug: 'product-manager', title: 'Product Manager', text: pm },
  { slug: 'data-analytics', title: 'Data Analytics', text: data },
  { slug: 'financial-analyst', title: 'Financial Analyst', text: finance },
  { slug: 'digital-marketing', title: 'Digital Marketing', text: marketing },
]

/** Reads `## Overview` and each `### Round N: name` with its `**Tests:**` line and numbered questions. */
export function parseRole(slug: string, title: string, text: string): PrepRole {
  const md = text.replace(/\r\n/g, '\n')
  const overview = /^## Overview\s*\n([\s\S]*?)(?=\n## )/m.exec(md)?.[1].trim() ?? ''
  const rounds = md.split(/^### Round \d+:\s*/m).slice(1).map(block => {
    const [name, ...rest] = block.split('\n')
    const body = rest.join('\n')
    return {
      name: name.trim(),
      tests: /\*\*Tests:\*\*\s*([\s\S]*?)(?=\n\s*\n|\n\*\*)/.exec(body)?.[1].trim() ?? '',
      questions: [...body.matchAll(/^\d+\.\s+(.+)$/gm)].map(m => m[1].trim()),
    }
  })
  return { slug, title, overview, rounds }
}

export const PREP_ROLES: PrepRole[] = ROLE_FILES.map(f => parseRole(f.slug, f.title, f.text))
export const firstSentence = (s: string) => /^.*?[.!?](?=\s|$)/.exec(s)?.[0] ?? s
