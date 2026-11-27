// Copy for /why-mirror. Wording follows scaffold/compare.html. Mirror vs practicing alone only: no other products are named.

export const WHY = {
  eyebrow: 'Why Mirror',
  h1: ['Looking for a calmer way', 'to practice?'],
  sub: 'How Mirror compares with practicing alone in front of a mirror.',
  cta: 'Start a session',
  highlights: [
    { tone: 'violet', big: 'Kind', small: 'language, always' },
    { tone: 'green', big: 'Clear', small: 'reflection afterward' },
    { tone: 'amber', big: 'Calm', small: 'no timer' },
    { tone: 'yellow', big: 'Yours', small: 'sessions in one place' },
  ] as const,
  sideTitle: 'Side by side',
  tableLabel: 'Mirror compared with practicing alone',
  columns: ['', 'Mirror', 'Practicing alone'],
  yes: 'Yes',
  no: 'No',
  // true = yes, false = no, string = text
  rows: [
    { label: 'Follow-up questions', mirror: true, alone: false },
    { label: 'Reflection afterward', mirror: true, alone: false },
    { label: 'One next step', mirror: true, alone: 'Sometimes' },
    { label: 'Saved sessions', mirror: true, alone: false },
    { label: 'Practice any time', mirror: true, alone: true },
    // TODO(placeholder): sample price, replace with the real offer
    { label: 'Cost', mirror: 'From $0 (sample)', alone: 'Free' },
  ] as { label: string; mirror: boolean | string; alone: boolean | string }[],
  waysTitle: 'Four ways Mirror helps',
  ways: [
    { h: 'Listens', p: 'Builds on what you said.' },
    { h: 'Asks', p: 'Gentle follow-ups.' },
    { h: 'Reflects', p: 'What came through.' },
    { h: 'Guides', p: 'One small step.' },
  ],
  faqTitle: 'Questions people ask',
  faq: [
    { q: 'Is Mirror better than practicing with a friend?', a: 'It is different. Mirror is there any time, and you can practice as often as you like. A friend is great too.' },
    { q: 'Can I use both?', a: 'Of course.' },
  ],
}
