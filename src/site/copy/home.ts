// Home page copy. Wording follows the design-ref scaffold (index.html). Privacy sentences are NOT here: the page renders
// CLAIMS from src/pages/landing/content.ts verbatim (one of them says "score", which the copy lint would reject here).
// Everything marked SAMPLE is placeholder content and is shown with a visible "Sample" label.

export const SAMPLE_LABEL = 'Sample'

export const HERO = {
  title: ['Practice your story out loud.', 'Hear it come through clearly.'],
  sub: ['A calm space to talk about your experience with a friendly voice,', 'then get a kind, clear reflection afterward.'],
  cta: 'Start a session',
}

export const SCENE = {
  label: 'A sample of how a practice session list fills up and opens a reflection',
  sampleNote: 'Sample sessions',
  head: 'Your sessions',
  detailTitle: 'Your reflection is ready',
  lines: [
    ['Came through clearly:', ' how you led the redesign and why it mattered.'],
    ['Your main growth area:', ' one number worth explaining.'],
  ],
  later: 'Later',
  again: 'Practice again',
  saved: 'Session saved',
  card: { badge: 'NEW', title: 'Mirror field notes: talking about your work', link: 'Read the notes', href: '/notes' },
  // TODO(placeholder): sample sessions, replace with real example data if wanted. Fields: title, meta, tag, colour 1, colour 2.
  rows: [
    ['Onboarding redesign', 'Product designer · 22 min', 'Came through clearly', '#f0c0ff', '#da8fff'],
    ['Design system story', 'Product designer · 18 min', 'Mostly came through', '#ffbd7e', '#e16540'],
    ['Leading a small team', 'Design lead · 25 min', 'Found your footing', '#b7efb2', '#1b9c8a'],
    ['Pricing page study', 'Product designer · 15 min', 'Not yet explored', '#99fff9', '#48bff4'],
    ['A tough trade-off', 'Product designer · 20 min', 'Worth revisiting', '#ffe4ff', '#993dca'],
    ['Working with engineers', 'Design lead · 19 min', 'Came through strongly', '#ffeed8', '#f4a360'],
    ['First freelance project', 'Designer · 16 min', 'Your role became clearer', '#c8c4ea', '#6a689f'],
  ] as [string, string, string, string, string][],
}

export const STORIES = {
  title: ['People practicing', 'with Mirror'],
  cta: 'Read their stories',
  href: '/journeys',
  // TODO(placeholder): real quotes, names and roles shared with permission; real numbers if used.
  portrait: { who: 'Sample name · Product designer', text: '"Placeholder quote. Replace with a real person\'s words, shared with their permission."' },
  pink: { big: '12 sessions', small: 'practiced before the big day' },
  green: { big: '3 stories', small: 'that now come through clearly' },
  wide: { text: '"Placeholder quote. Talking it through out loud, then reading a calm reflection, helped me find my footing."', who: 'Sample name · Engineer' },
  // TODO(placeholder): partner wordmarks are invented.
  logosLabel: 'Sample partner names',
  logos: ['Pathwisse', 'Campus One', 'Northbridge', 'Lumen Labs', 'Studio Nine', 'Kindred', 'Orbit', 'Field & Co', 'Atlas', 'Meridian'],
}

export const PILLARS = {
  title: ['One calm place to practice,', 'reflect and grow'],
  items: [
    { id: 'mirror', name: 'Mirror Voice', text: 'A friendly conversation about your experience, at your pace.', colors: ['#f0c0ff', '#ffeed8', '#c8c4ea'], dot: ['#f0c0ff', '#c8c4ea'] },
    { id: 'practice', name: 'Practice', text: 'Pick your target role and talk through the moments that matter.', colors: ['#ffbd7e', '#ffeed8', '#dc93c3'], dot: ['#ffbd7e', '#dc93c3'] },
    { id: 'reflect', name: 'Reflection', text: 'See what came through and what is still to explore.', colors: ['#b7efb2', '#ffeed8', '#79e7dc'], dot: ['#b7efb2', '#79e7dc'] },
    { id: 'grow', name: 'Growth', text: 'One small, doable next step after every session.', colors: ['#ffbd7e', '#ffeed8', '#c8c4ea'], dot: ['#ffeed8', '#c8c4ea'] },
  ] as { id: string; name: string; text: string; colors: [string, string, string]; dot: [string, string] }[],
  sideLabel: 'Sections',
}

export const VOICE = {
  eyebrow: 'Mirror Voice',
  title: ['Turn your experience into a story', 'with '],
  titleAccent: 'Mirror Voice',
  text: 'Mirror asks friendly questions about your work, listens closely, and follows up where it helps. Afterward, the Reflection Guide shares what came through and one next step.',
  tabsLabel: 'What Mirror does',
  tabs: [
    { id: 'voice', label: 'Mirror Voice', cta: 'Explore Mirror Voice' },
    { id: 'deeper', label: 'Deeper Questions', cta: 'Explore Deeper Questions' },
    { id: 'guide', label: 'Reflection Guide', cta: 'Explore the Reflection Guide' },
    { id: 'library', label: 'Experience library', cta: 'Explore your library' },
    { id: 'summary', label: 'Your summary', cta: 'See a summary' },
  ],
  ctaHref: '/product',
  // TODO(placeholder): sample conversation and rows inside the tab panels (illustrative, not real user data).
  sampleNote: 'Sample conversation, not a real session',
  chat: {
    head: 'Practice session', muted: 'Target role · Product designer',
    mirror1: "Tell me about a project you're proud of. What was your part in it?",
    you: 'I led the redesign of our onboarding. Sign-ups went up quite a bit.',
    mirror2: 'That sounds meaningful. What did you decide on your own, and what did the team decide together?',
  },
  deeper: {
    head: 'Areas to explore', muted: 'from this conversation',
    rows: [
      ['Your role in the onboarding redesign', 'Explored', '--violet-400', false],
      ['A number worth explaining', 'Exploring', '--teal', true],
      ['A tough call you made', 'Exploring', '--orange', true],
      ['What you would do differently', 'Not yet explored', '--blue', false],
      ['Working with engineering', 'Not yet explored', '--green', false],
    ] as [string, string, string, boolean][],
    toast: ['You have ', '3 moments', ' worth talking through.'],
  },
  guide: {
    head: 'What came through', muted: 'Reflection Guide',
    rows: [
      ['strong', 'Came through clearly', 'You owned the research plan'],
      ['mostly', 'Mostly came through', 'Impact on sign-ups'],
      ['refined', 'Refined during the conversation', 'Team size and timeline'],
      ['revisit', 'Worth revisiting', 'Why the first version was dropped'],
    ] as [string, string, string][],
  },
  library: { head: 'Your space', muted: 'Experience library', tiles: ['Onboarding redesign', 'Design system', 'Pricing page study'], add: '+ Add your work' },
  summary: {
    head: 'Your summary', muted: 'Session 4',
    p1: 'You explained your design choices with calm and care. Your role became clearer as we talked.',
    p2: 'One next step: practice the sign-up number in a single sentence.',
    button: 'Try again',
  },
}

export const BENTO = {
  listens: { title: ['A friendly voice that', 'listens closely'], chips: ['Your first project', 'A hard decision', 'Working with others', 'A number to explain'], dots: ['--green', '--teal', '--violet-400', '--orange'] },
  pace: { title: ['Practice at your', 'own pace'], note: 'No timer. No pressure.' },
  through: {
    title: ['See what came', 'through today'], filter: 'Target role · Product designer',
    rows: [['Onboarding redesign', 'Came through clearly'], ['Design system', 'Mostly came through'], ['Pricing study', 'Not yet explored'], ['Mentoring', 'Not yet explored']],
  },
  roles: { title: ['Ready for every', 'kind of role'], rowA: ['Design', 'Engineering', 'Product', 'Data', 'Marketing'], rowB: ['Research', 'Operations', 'Sales', 'Support', 'Finance'], label: 'Kinds of role' },
}

export interface PillarSection {
  id: string; eyebrow: string; title: string[]; stats: [string, string][]; colors: [string, string, string]
}
export const SECTIONS: PillarSection[] = [
  { id: 'practice', eyebrow: 'Practice', title: ['Talk through the moments', 'that matter to you'], stats: [['20 min', 'a typical session'], ['Any role', 'you are aiming for']], colors: ['#ffbd7e', '#ffeed8', '#dc93c3'] },
  { id: 'reflect', eyebrow: 'Reflection', title: ['A kind, clear reflection', 'after every conversation'], stats: [['1', 'small next step, every time'], ['Always', 'about practice and growth']], colors: ['#b7efb2', '#ffeed8', '#b7efb2'] },
  { id: 'grow', eyebrow: 'Growth', title: ['Grow a little', 'with every session'], stats: [['Your sessions', 'all in one place'], ['Try again', 'whenever you like']], colors: ['#ffbd7e', '#ffeed8', '#c8c4ea'] },
]

export const PRACTICE = {
  head: 'Your conversation plan', muted: 'Areas to explore', ready: 'Ready',
  rows: [['Your role on the team', '--orange'], ['A decision you\'re proud of', '--violet-400'], ['Something that didn\'t go to plan', '--teal']] as [string, string][],
  sub: [
    { title: 'Pick your target role', text: 'Mirror shapes the conversation around it.', href: '/product' },
    { title: 'Add your work', text: 'Bring a résumé or project notes to talk about.', href: '/add-your-work' },
  ],
  learn: 'Learn more',
}
export const REFLECT = {
  head: 'What came through', muted: 'Session 4',
  rows: [['strong', 'Came through strongly', 'How you led the research'], ['mostly', 'Found your footing', 'Explaining the trade-offs'], ['revisit', 'Not enough to say yet', 'Long-term impact']] as [string, string, string][],
}
export const GROW = { head: 'Your sessions', muted: 'This month', barsLabel: 'Sample bars, not real data', bars: [30, 45, 42, 60, 72, 80] }

export const PRIVACY = {
  eyebrow: 'Privacy',
  title: 'Your space stays yours',
  badges: ['Private', 'Yours'],
  // Headings only; the body of each card is a CLAIMS sentence (indexes into CLAIMS).
  cards: [{ h: 'Your audio', claim: 0 }, { h: 'Sharing', claim: 2 }, { h: 'Your data', claim: 3 }],
}

export const WORK = {
  eyebrow: 'Your work', title: "Bring what you've made",
  text: 'Add notes, a résumé or links so the conversation starts from your real work.',
  cta: 'Add your work', href: '/add-your-work',
  // TODO(placeholder): tool initials are decorative, not a list of integrations.
  iconsA: ['Cv', 'Fg', 'Gh', 'Nt', 'Dr', 'Pf'], iconsB: ['Ln', 'Dk', 'Mr', 'Fm', 'Nb', 'Pd'],
  iconsLabel: 'Sample tool initials',
}
export const FIRST = {
  eyebrow: 'Getting started', title: 'Your first session in five minutes',
  text: 'A short walkthrough of how a practice session feels.',
  cta: 'Watch the walkthrough', href: '/product',
  // TODO(placeholder): no walkthrough video exists yet; the card is a labelled placeholder.
  videoNote: 'Sample card, video not yet recorded',
}

export const FAQ = {
  title: 'Questions, answered plainly',
  items: [
    { q: 'What is Mirror?', a: 'A calm space to practice talking about your experience out loud, then read a kind, clear reflection afterward.' },
    { q: 'Do I have to speak?', a: 'No. You can speak your answers or type them, whichever feels better today.' },
    { q: 'Can I answer the same question again?', a: 'Yes. Say it again whenever you like and see what changed.' },
  ],
  // Questions whose answers are CLAIMS sentences (claim = index into CLAIMS).
  privacyItems: [
    { q: 'Does Mirror keep my audio?', claim: 0 },
    { q: 'Are my answers graded?', claim: 1 },
    { q: 'Who can see my practice?', claim: 2 },
    { q: 'Can I remove my data?', claim: 3 },
  ],
}
