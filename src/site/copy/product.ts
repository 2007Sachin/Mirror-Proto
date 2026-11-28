// Copy for /product and /product/:slug. One template, content keyed by slug. Wording follows scaffold/product.html.
// Rules: see copy/lint.test.ts. No scores, percentages, streaks or "x of y".

export interface ProductRow { text: string; tag: string; tone?: 'strong' | 'mostly' | 'revisit'; dot?: string }
export interface ProductFeature {
  id?: string; eyebrow: string; title: string; text: string; checks?: string[]
  link?: { label: string; href: string }; cta?: { label: string; href: string }
  mockHead: string; rows: ProductRow[]
}
export interface ProductTab { id: string; title: string; desc: string; panelTitle: string; panelMuted: string; play: string }
export interface ProductPage {
  slug: string; navLabel: string; eyebrow: string; h1: [string, string]; sub: string; cta: string
  mockHead: [string, string]; chat: { who: 'mirror' | 'you'; text: string }[]
  statement: [string, string]
  features: [ProductFeature, ProductFeature]
  cardsTitle: [string, string]; cardsSub: string; cards: { h: string; p: string }[]
  tabs: ProductTab[]
  faq: { q: string; a: string }[]
}

export const PRODUCT_COMMON = {
  ratingSample: 'Sample rating line — replace with a real source',
  logosNote: 'Placeholder partner wordmarks — replace with real, permitted ones',
  logosLabel: 'Sample partner names',
  // TODO(placeholder): real partner wordmarks needed
  logos: ['Pathwisse', 'Campus One', 'Northbridge', 'Lumen Labs', 'Studio Nine', 'Kindred', 'Orbit', 'Field & Co', 'Atlas', 'Meridian'],
  statsTitle: 'What practice can look like',
  statsSub: 'Sample numbers for layout only.',
  // TODO(placeholder): sample numbers, replace or remove
  stats: [
    { tone: 'violet', to: 12, suffix: '', label: 'sessions in a month' },
    { tone: 'green', to: 3, suffix: '', label: 'stories that came through' },
    { tone: 'amber', to: 20, suffix: ' min', label: 'a typical session' },
    { tone: 'cyan', to: 1, suffix: '', label: 'next step, every time' },
  ] as const,
  sampleTag: 'Sample',
  tabsTitle: 'How people use Mirror',
  tabsSub: 'Pick a moment to see it in action.',
  tabsLabel: 'How people use Mirror',
  faqTitle: 'Questions people ask',
  notFound: {
    title: 'We could not find that page',
    text: 'That product page is not here. Here is where to look instead.',
    back: 'See Mirror Voice',
    all: 'Back to the home page',
  },
}

const TABS_COMMON: ProductTab[] = [
  { id: 'first', title: 'Before a first interview', desc: 'Warm up with a friendly run-through.', panelTitle: 'Your conversation plan', panelMuted: 'Three areas to explore today', play: '▶ 0:42 · placeholder video' },
  { id: 'change', title: 'Changing careers', desc: 'Connect past work to a new role.', panelTitle: 'Your target role', panelMuted: 'Getting to know the role', play: '▶ 0:51 · placeholder video' },
  { id: 'tough', title: 'After a tough conversation', desc: 'Find your footing and try again.', panelTitle: 'Your summary', panelMuted: 'Found your footing', play: '▶ 0:37 · placeholder video' },
]

const CARDS_COMMON = [
  { h: 'Your pace', p: 'No timer and no pressure. Pause whenever you like.' },
  { h: 'Your words', p: 'Mirror helps you say it your way, not a script.' },
  { h: 'Your growth', p: 'One small, doable next step after every session.' },
]

const FAQ_COMMON = [
  { q: 'Is Mirror an interview simulator?', a: 'Mirror is a calm space to practice talking about your experience. It is always about practice and growth.' },
  { q: 'Do I need to prepare anything?', a: 'No. You can add your work if you like, but you can also just start talking.' },
  { q: 'Can I stop halfway?', a: 'Yes. Stop any time. Your session is saved so you can come back.' },
  { q: 'What happens after a session?', a: 'The Reflection Guide shares what came through and one next step. If there is not enough to say yet, it tells you that kindly.' },
]

const V = 'var(--ms-violet-400)'
const C = '#79e7dc'
const O = '#ffbd7e'
const GENTLE: [string, string] = ['Gentle by design,', 'clear where it counts']
const THREE = 'Three ideas shape every session.'

export const PRODUCT_PAGES: Record<string, ProductPage> = {
  voice: {
    slug: 'voice', navLabel: 'Mirror Voice', eyebrow: 'Mirror Voice', h1: ['A friendly voice to practice', 'your story with'],
    sub: 'Talk about your work out loud, at your own pace. Mirror listens, asks kind follow-up questions and helps you find the words.',
    cta: 'Start a session',
    mockHead: ['Practice session', 'Target role · Product designer'],
    chat: [
      { who: 'mirror', text: "Tell me about a project you're proud of." },
      { who: 'you', text: 'I led our onboarding redesign.' },
      { who: 'mirror', text: 'What did you decide on your own?' },
    ],
    statement: ['Practice that feels like a calm conversation,', 'not a quiz.'],
    features: [
      {
        eyebrow: 'Listens closely', title: 'Questions that follow your story',
        text: 'Mirror builds on what you just said, so each question feels natural and helps you go one step deeper.',
        checks: ['Follows up where it helps', 'Never rushes you', 'Plain, friendly language'],
        link: { label: 'See how it works', href: '/product/deeper-questions' },
        mockHead: 'Areas to explore',
        rows: [
          { text: 'Your role in the redesign', tag: 'Explored', dot: V },
          { text: 'A number worth explaining', tag: 'Exploring', dot: C },
          { text: 'A tough call you made', tag: 'Not yet explored', dot: O },
        ],
      },
      {
        id: 'reflection', eyebrow: 'Reflection Guide', title: 'A kind, clear reflection afterward',
        text: 'See what came through clearly, what mostly came through and what is still to explore. Always with one small next step.',
        cta: { label: 'Try a session', href: '/get-started' },
        mockHead: 'What came through',
        rows: [
          { text: 'How you led the research', tag: 'Came through clearly', tone: 'strong' },
          { text: 'Impact on sign-ups', tag: 'Mostly came through', tone: 'mostly' },
          { text: 'Why plans changed', tag: 'Worth revisiting', tone: 'revisit' },
        ],
      },
    ],
    cardsTitle: GENTLE, cardsSub: THREE, cards: CARDS_COMMON, tabs: TABS_COMMON, faq: FAQ_COMMON,
  },
  'deeper-questions': {
    slug: 'deeper-questions', navLabel: 'Deeper Questions', eyebrow: 'Deeper Questions', h1: ['Questions that help you', 'go one step further'],
    sub: 'Mirror builds on what you just said and asks the kind of follow-up a curious listener would.',
    cta: 'Start a session',
    mockHead: ['Practice session', 'Target role · Product designer'],
    chat: [
      { who: 'you', text: 'I led our onboarding redesign.' },
      { who: 'mirror', text: 'What was the hardest part of leading it?' },
      { who: 'you', text: 'Getting the team to agree on one flow.' },
    ],
    statement: ['Follow-ups that feel natural,', 'never like a trap.'],
    features: [
      {
        eyebrow: 'Listens closely', title: 'Questions that follow your story',
        text: 'Mirror builds on what you just said, so each question feels natural and helps you go one step deeper.',
        checks: ['Follows up where it helps', 'Never rushes you', 'Plain, friendly language'],
        link: { label: 'Hear it in Mirror Voice', href: '/product/voice' },
        mockHead: 'Areas to explore',
        rows: [
          { text: 'Your role in the redesign', tag: 'Explored', dot: V },
          { text: 'A number worth explaining', tag: 'Exploring', dot: C },
          { text: 'A tough call you made', tag: 'Not yet explored', dot: O },
        ],
      },
      {
        eyebrow: 'Your words', title: 'You choose where to go next',
        text: 'Skip a question, answer it later or stay with it a little longer. Mirror follows your lead.',
        cta: { label: 'Try a session', href: '/get-started' },
        mockHead: 'Your choices',
        rows: [
          { text: 'Answer it now', tag: 'Ready', dot: V },
          { text: 'Come back to it', tag: 'Later', dot: C },
          { text: 'Try a different question', tag: 'Another', dot: O },
        ],
      },
    ],
    cardsTitle: GENTLE, cardsSub: THREE, cards: CARDS_COMMON, tabs: TABS_COMMON, faq: FAQ_COMMON,
  },
  'reflection-guide': {
    slug: 'reflection-guide', navLabel: 'Reflection Guide', eyebrow: 'Reflection Guide', h1: ['A kind, clear reflection', 'after every session'],
    sub: 'See what came through clearly, what mostly came through and what is still to explore. Always with one small next step.',
    cta: 'Start a session',
    mockHead: ['Your summary', 'Target role · Product designer'],
    chat: [
      { who: 'mirror', text: 'Your research story came through clearly.' },
      { who: 'you', text: 'What should I work on next?' },
      { who: 'mirror', text: 'Try explaining why plans changed, in one sentence.' },
    ],
    statement: ['Soft words, real reflection,', 'one step at a time.'],
    features: [
      {
        id: 'reflection', eyebrow: 'Reflection Guide', title: 'A kind, clear reflection afterward',
        text: 'See what came through clearly, what mostly came through and what is still to explore. Always with one small next step.',
        cta: { label: 'Try a session', href: '/get-started' },
        mockHead: 'What came through',
        rows: [
          { text: 'How you led the research', tag: 'Came through clearly', tone: 'strong' },
          { text: 'Impact on sign-ups', tag: 'Mostly came through', tone: 'mostly' },
          { text: 'Why plans changed', tag: 'Worth revisiting', tone: 'revisit' },
        ],
      },
      {
        eyebrow: 'Your growth', title: 'One small, doable next step',
        text: 'If there is not enough to say yet, Mirror tells you that kindly and suggests what to try next.',
        link: { label: 'Hear it in Mirror Voice', href: '/product/voice' },
        mockHead: 'Your next step',
        rows: [
          { text: 'Explain why plans changed', tag: 'Try next', dot: V },
          { text: 'Add one example', tag: 'Optional', dot: C },
        ],
      },
    ],
    cardsTitle: GENTLE, cardsSub: THREE, cards: CARDS_COMMON, tabs: TABS_COMMON, faq: FAQ_COMMON,
  },
  'say-it-again': {
    slug: 'say-it-again', navLabel: 'Say it again', eyebrow: 'Say it again', h1: ['Answer once more', 'and see what changed'],
    sub: 'Try an answer again whenever you like, then look at what came through differently.',
    cta: 'Start a session',
    mockHead: ['Practice session', 'Target role · Product designer'],
    chat: [
      { who: 'mirror', text: 'Want to answer that once more?' },
      { who: 'you', text: 'Yes. I led our onboarding redesign and chose the flow.' },
      { who: 'mirror', text: 'That sounds clearer. What changed for you?' },
    ],
    statement: ['A second try is just practice,', 'never a penalty.'],
    features: [
      {
        eyebrow: 'Your pace', title: 'Try again, as often as you like',
        text: 'No timer and no pressure. Answer once more whenever you feel ready.',
        checks: ['Never rushes you', 'Keeps your earlier answer', 'Plain, friendly language'],
        link: { label: 'Read about the Reflection Guide', href: '/product/reflection-guide' },
        mockHead: 'Your answers',
        rows: [
          { text: 'First answer', tag: 'Saved', dot: V },
          { text: 'Second answer', tag: 'Saved', dot: C },
        ],
      },
      {
        eyebrow: 'Reflection Guide', title: 'See what changed',
        text: 'Mirror points out what came through more clearly the second time, kindly and in plain words.',
        cta: { label: 'Try a session', href: '/get-started' },
        mockHead: 'What changed',
        rows: [
          { text: 'How you led the research', tag: 'Came through clearly', tone: 'strong' },
          { text: 'Impact on sign-ups', tag: 'Mostly came through', tone: 'mostly' },
        ],
      },
    ],
    cardsTitle: GENTLE, cardsSub: THREE, cards: CARDS_COMMON, tabs: TABS_COMMON, faq: FAQ_COMMON,
  },
  'job-match': {
    slug: 'job-match', navLabel: 'Your job, your résumé', eyebrow: 'Your job, your résumé', h1: ['See which skills', 'your résumé backs'],
    sub: 'Add a role and your résumé, and Mirror shows which skills your work already supports.',
    cta: 'Start a session',
    mockHead: ['Your target role', 'Product designer'],
    chat: [
      { who: 'mirror', text: 'Your résumé backs research and prototyping.' },
      { who: 'you', text: 'What about leading a team?' },
      { who: 'mirror', text: 'That one is worth adding an example for.' },
    ],
    statement: ['Start from what you have made,', 'not from a blank page.'],
    features: [
      {
        eyebrow: 'Your work', title: 'Skills, shown kindly',
        text: 'See which parts of the role your résumé already backs, and which you might want to talk about more.',
        checks: ['Starts from your own words', 'Plain, friendly language', 'You choose what to practice'],
        link: { label: 'Add your work', href: '/add-your-work' },
        mockHead: 'Skills for the role',
        rows: [
          { text: 'User research', tag: 'Backed by your résumé', tone: 'strong' },
          { text: 'Prototyping', tag: 'Mostly backed', tone: 'mostly' },
          { text: 'Leading a team', tag: 'Worth adding', tone: 'revisit' },
        ],
      },
      {
        eyebrow: 'Your growth', title: 'Practice what matters for the role',
        text: 'Pick a skill and Mirror shapes a conversation around it.',
        cta: { label: 'Try a session', href: '/get-started' },
        mockHead: 'Areas to explore',
        rows: [
          { text: 'Leading a team', tag: 'Not yet explored', dot: O },
          { text: 'User research', tag: 'Explored', dot: V },
        ],
      },
    ],
    cardsTitle: GENTLE, cardsSub: THREE, cards: CARDS_COMMON, tabs: TABS_COMMON, faq: FAQ_COMMON,
  },
}

export const DEFAULT_PRODUCT = 'voice'
