// Notes (blog) copy. Every post, author and date is invented sample text.
// TODO(placeholder): real posts, a real author and real dates needed; nothing here was written by or about a real person.

export const NOTES_PAGE = {
  title: 'Notes',
  h1: 'Field notes',
  sub: 'Short, kind reads on talking about your work.',
  sampleLabel: 'Sample',
  read: 'Read',
  searchLabel: 'Search notes',
  searchPlaceholder: 'Search notes',
  empty: 'No notes match yet.',
  shown: 'notes shown',
  filters: [
    { id: 'practice', label: 'Practice' }, { id: 'reflection', label: 'Reflection' },
    { id: 'growth', label: 'Growth' }, { id: 'stories', label: 'Stories' },
  ],
} as const

export interface Section { h: string; p: string; callout?: string; quote?: string }
export interface Note {
  slug: string
  tag: 'practice' | 'reflection' | 'growth' | 'stories'
  tagLabel: string
  title: string
  summary: string
  date: string
  mins: number
  gradient: string
  sections: Section[]
}

const G = [
  'linear-gradient(135deg,#f0c0ff,#c8c4ea)', 'linear-gradient(135deg,#ffbd7e,#dc93c3)',
  'linear-gradient(135deg,#b7efb2,#79e7dc)', 'linear-gradient(135deg,#79e7dc,#c8c4ea)', 'linear-gradient(135deg,#ffbd7e,#c8c4ea)',
]
const label = { practice: 'Practice', reflection: 'Reflection', growth: 'Growth', stories: 'Stories' } as const
const generic = (lead: string): Section[] => [
  { h: 'Start small', p: `Placeholder text. ${lead} Keep sentences short and plain, and speak to "you".` },
  { h: 'Say it out loud', p: 'Placeholder text. Try it once aloud, then say it again and notice what changed.' },
  { h: 'Choose one next step', p: 'Placeholder text. Small and doable is perfect.' },
]
const mk = (slug: string, tag: Note['tag'], title: string, summary: string, g: number): Note => ({
  slug, tag, tagLabel: label[tag], title, summary, date: 'Nov 2026', mins: 5, gradient: G[g % G.length], sections: generic(summary),
})

// TODO(placeholder): real article text needed for every note below.
export const FEATURED: Note = {
  slug: 'story-of-a-project-you-are-proud-of', tag: 'practice', tagLabel: 'Practice',
  title: 'How to tell the story of a project you are proud of',
  summary: 'A simple shape for any project story, and how to practice it out loud.',
  date: 'Nov 2026', mins: 6, gradient: 'linear-gradient(135deg,#f0c0ff,#ffeed8)',
  sections: [
    { h: 'Start with why it mattered', p: 'Begin with the reason the project was worth doing. One or two sentences is enough.', callout: 'Tip: say it out loud once before you write it down.' },
    { h: 'Say what you did', p: 'Be clear about your part. "I" for what you did, "we" for what the team did together.', quote: 'Your role became clearer as we talked. (sample reflection line)' },
    { h: 'Share what changed', p: 'A number can help, if you can explain it in one sentence. If not, describe the change plainly.' },
    { h: 'End with one next step', p: 'What would you do next time? Small and doable is perfect.' },
  ],
}

export const NOTES: Note[] = [
  FEATURED,
  mk('project-story-in-three-parts', 'practice', 'Telling a project story in three parts', 'A three-part shape for any project.', 0),
  mk('reading-your-reflection-kindly', 'reflection', 'Reading your reflection kindly', 'How to read notes about your own words.', 1),
  mk('one-small-step-a-day', 'growth', 'One small step a day', 'Small, regular steps add up.', 2),
  mk('number-in-one-sentence', 'practice', 'Explaining a number in one sentence', 'Say what a number means, plainly.', 3),
  mk('a-calm-first-interview', 'stories', 'What a calm first interview looks like', 'A look at a gentler first interview.', 4),
  mk('feedback-into-a-next-step', 'growth', 'Turning feedback into a next step', 'Pick one thing to try next.', 0),
  mk('teamwork-without-cliches', 'practice', 'Talking about teamwork without the clichés', 'Describe teamwork with a real moment.', 1),
  mk('not-enough-to-say-yet', 'reflection', 'When there is not enough to say yet', 'A short session is a fine outcome.', 2),
  mk('teaching-to-product-design', 'stories', 'From teaching to product design', 'Telling an old job as a new story.', 3),
]

export const POST_PAGE = {
  byline: 'Sample author · MIRROR',
  sampleNote: 'Sample post. Not written by a real author.',
  minRead: 'min read',
  tocLabel: 'On this page',
  share: 'Share',
  copyLink: 'Copy link',
  copied: 'Link copied',
  keepReading: 'Keep reading',
  back: '← All notes',
  notFoundBack: 'Notes',
} as const
