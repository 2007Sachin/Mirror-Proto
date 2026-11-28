// Copy for /for/:persona (students, career-changers, returners). Wording follows scaffold/solution.html.
// Rules: see copy/lint.test.ts.

export interface Persona {
  slug: string; navLabel: string; eyebrow: string; h1: [string, string]; sub: string
  momentsTitle: [string, string]; momentsSub: string
  moments: { id?: string; h: string; p: string; bg: string }[]
  space: { eyebrow: string; title: string; text: string; cta: string; mockHead: string }
  reasonsTitle: string; reasons: { h: string; p: string }[]
  faq: { q: string; a: string }[]
}

export const SOLUTION_COMMON = {
  cta: 'Start a session',
  sampleTag: 'Sample',
  logosNote: 'Placeholder partner wordmarks — replace with real, permitted ones',
  logosLabel: 'Sample partner names',
  // TODO(placeholder): real partner wordmarks needed
  logos: ['Pathwisse', 'Campus One', 'Northbridge', 'Lumen Labs', 'Studio Nine', 'Kindred', 'Orbit', 'Field & Co', 'Atlas', 'Meridian'],
  momentsSub: 'Every session is shaped around where you are.',
  reasonsSub: 'Sample reasons for layout only.',
  faqTitle: 'Questions people ask',
  spaceHref: '/product/voice',
  spaceLabel: 'See your space',
  barsLabel: 'Sample chart of sessions over time',
  notFound: {
    title: 'We could not find that page',
    text: 'There is no page for that group yet. Here are the ones we have.',
    back: 'Mirror for students',
    all: 'Back to the home page',
  },
}

export const DEFAULT_PERSONA = 'students'

export const PERSONAS: Record<string, Persona> = {
  students: {
    slug: 'students', navLabel: 'Students', eyebrow: 'Mirror for students', h1: ['Walk into your first big', 'conversation feeling ready'],
    sub: 'Practice telling the story of your projects, internships and side work, then get a kind reflection and one next step.',
    momentsTitle: ['Practice the moments', 'that matter most'], momentsSub: 'Every session is shaped around where you are.',
    moments: [
      { h: 'Your first project story', p: 'Turn a class project into a clear, honest story about your part in it.', bg: 'var(--ms-amber-50)' },
      { id: 'switchers', h: 'Changing direction', p: 'Connect what you did before to the role you want next.', bg: 'var(--ms-violet-100)' },
    ],
    space: { eyebrow: 'Your space', title: 'Everything you practice, in one place', text: 'Your sessions and your work live together, so each conversation builds on the last.', cta: 'See your space', mockHead: 'Your sessions' },
    reasonsTitle: 'Why students choose Mirror',
    reasons: [
      { h: 'Calm, not scary', p: 'Practice where nothing is at stake.' },
      { h: 'Honest, kindly put', p: 'Soft words, real reflection.' },
      { h: 'Small next steps', p: 'Something doable after every session.' },
    ],
    faq: [
      { q: 'Is Mirror only for job interviews?', a: 'No. Any time you want to talk about your experience clearly, Mirror can help you practice.' },
      { q: 'Do I need a résumé?', a: 'No. You can start with nothing and add your work later.' },
    ],
  },
  'career-changers': {
    slug: 'career-changers', navLabel: 'Career changers', eyebrow: 'Mirror for career changers', h1: ['Tell a new story', 'with confidence'],
    sub: 'Practice connecting the work you have done to the role you want next, then get a kind reflection and one next step.',
    momentsTitle: ['Practice the moments', 'that matter most'], momentsSub: 'Every session is shaped around where you are.',
    moments: [
      { h: 'Your bridge story', p: 'Connect what you did before to the role you want next.', bg: 'var(--ms-amber-50)' },
      { id: 'switchers', h: 'Changing direction', p: 'Say why you are making the move, in your own plain words.', bg: 'var(--ms-violet-100)' },
    ],
    space: { eyebrow: 'Your space', title: 'Everything you practice, in one place', text: 'Your sessions and your work live together, so each conversation builds on the last.', cta: 'See your space', mockHead: 'Your sessions' },
    reasonsTitle: 'Why career changers choose Mirror',
    reasons: [
      { h: 'Calm, not scary', p: 'Practice where nothing is at stake.' },
      { h: 'Honest, kindly put', p: 'Soft words, real reflection.' },
      { h: 'Small next steps', p: 'Something doable after every session.' },
    ],
    faq: [
      { q: 'Is Mirror only for job interviews?', a: 'No. Any time you want to talk about your experience clearly, Mirror can help you practice.' },
      { q: 'Do I need a résumé?', a: 'No. You can start with nothing and add your work later.' },
    ],
  },
  returners: {
    slug: 'returners', navLabel: 'Returners', eyebrow: 'Mirror for returners', h1: ['Find your words', 'after time away'],
    sub: 'Practice talking about your past work and what you want next, then get a kind reflection and one next step.',
    momentsTitle: ['Practice the moments', 'that matter most'], momentsSub: 'Every session is shaped around where you are.',
    moments: [
      { h: 'Your story so far', p: 'Say what you did, what you learned and what you are ready for.', bg: 'var(--ms-amber-50)' },
      { id: 'switchers', h: 'Talking about time away', p: 'Find a calm, honest way to explain a break.', bg: 'var(--ms-violet-100)' },
    ],
    space: { eyebrow: 'Your space', title: 'Everything you practice, in one place', text: 'Your sessions and your work live together, so each conversation builds on the last.', cta: 'See your space', mockHead: 'Your sessions' },
    reasonsTitle: 'Why returners choose Mirror',
    reasons: [
      { h: 'Calm, not scary', p: 'Practice where nothing is at stake.' },
      { h: 'Honest, kindly put', p: 'Soft words, real reflection.' },
      { h: 'Small next steps', p: 'Something doable after every session.' },
    ],
    faq: [
      { q: 'Is Mirror only for job interviews?', a: 'No. Any time you want to talk about your experience clearly, Mirror can help you practice.' },
      { q: 'Do I need a résumé?', a: 'No. You can start with nothing and add your work later.' },
    ],
  },
}
