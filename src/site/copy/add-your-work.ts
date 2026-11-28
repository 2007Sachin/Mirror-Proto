// Add your work copy. Lists ONLY sources MIRROR supports today: pasted or uploaded résumé (PDF), LinkedIn PDF, pasted job description.
// The scaffold's "idea" cards (calendar, notes export, portfolio link, project notes, cover letter, course page) are dropped on purpose.
// TODO(placeholder): confirm the in-app menu names in the "how" steps ("Your space", "Add your work") before launch.

export const ADD_PAGE = {
  title: 'Add your work',
  eyebrow: 'Add your work',
  h1: ['Start from what', 'you have made'],
  sub: 'Bring your work in, so the conversation starts from real projects.',
  searchLabel: 'Search',
  searchPlaceholder: 'Search',
  empty: 'Nothing here yet.',
  shown: 'sources shown',
  filters: [{ id: 'work', label: 'Your work' }, { id: 'role', label: 'Your target role' }],
} as const

export interface Source {
  slug: string
  tag: 'work' | 'role'
  tagLabel: string
  logo: string
  color: string
  name: string
  blurb: string
  title: string
  sub: string
  cta: string
  facts: { k: string; v: string }[]
  overview: string
  how: string[]
}

export const SOURCES: Source[] = [
  {
    slug: 'resume', tag: 'work', tagLabel: 'Your work', logo: 'Ré', color: '#993dca', name: 'Résumé',
    blurb: 'Start from what you have already written.',
    title: 'Bring your résumé into practice',
    sub: 'MIRROR reads what you share so questions start from your real experience.',
    cta: 'Add your résumé',
    facts: [{ k: 'Type', v: 'Your work' }, { k: 'Where it shows', v: 'Experience library' }, { k: 'You control', v: 'Delete your practice data' }],
    overview: 'Your résumé text shapes the questions. MIRROR shows which skills your résumé backs, then asks about the rest by voice or in text.',
    how: ['Open Your space.', 'Choose Add your work.', 'Paste your résumé, or pick a PDF file.'],
  },
  {
    slug: 'linkedin-pdf', tag: 'work', tagLabel: 'Your work', logo: 'Li', color: '#3789fa', name: 'LinkedIn PDF',
    blurb: 'Talk through the profile you already share.',
    title: 'Bring your LinkedIn PDF into practice',
    sub: 'Save your profile as a PDF and MIRROR starts from it.',
    cta: 'Add your LinkedIn PDF',
    facts: [{ k: 'Type', v: 'Your work' }, { k: 'Where it shows', v: 'Experience library' }, { k: 'You control', v: 'Delete your practice data' }],
    overview: 'A profile PDF works like a résumé: MIRROR reads its text and your questions start from your own experience.',
    how: ['Save your profile as a PDF from your LinkedIn page.', 'Open Your space and choose Add your work.', 'Pick the PDF file.'],
  },
  {
    slug: 'job-post', tag: 'role', tagLabel: 'Your target role', logo: 'Jo', color: '#e16540', name: 'Job post',
    blurb: 'Get to know the role you are aiming for.',
    title: 'Bring a job post into practice',
    sub: 'Paste the job description and practice for the job you actually want.',
    cta: 'Add a job post',
    facts: [{ k: 'Type', v: 'Your target role' }, { k: 'Where it shows', v: 'Your conversation plan' }, { k: 'You control', v: 'Delete your practice data' }],
    overview: 'The job description tells MIRROR which skills matter for the role. Questions follow from it and from your résumé together.',
    how: ['Copy the job description from the posting.', 'Open Your space and choose Add your work.', 'Paste the job description.'],
  },
]

export const ADD_DETAIL = {
  back: '← Add your work',
  overviewH: 'Overview',
  howH: 'How to add it',
  related: 'Related',
  notFoundBack: 'Add your work',
} as const
