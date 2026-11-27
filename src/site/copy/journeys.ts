// Journeys (customer stories) copy. Every story, person and number here is invented sample text.
// TODO(placeholder): real stories, shared with each person's permission, replace everything in STORIES.

export const JOURNEYS_PAGE = {
  title: 'Journeys',
  eyebrow: 'Journeys',
  h1: ['Real practice,', 'real growth'],
  sub: "Sample journeys for layout. Replace with real people's words, shared with permission.",
  sampleLabel: 'Sample',
  noticeLabel: 'Sample content',
  notice: 'These journeys are invented to show the layout. They are not real people and not real customers.',
  kindWords: { h2: 'Kind words', cta: 'See them all', href: '/kind-words' },
  kindSample: 'Sample quote. Replace with a real, permitted quote.',
  kindWho: ['Sample name', 'Placeholder role'],
} as const

export interface Stat { n: number; label: string; suffix?: string }
export interface Story {
  slug: string
  title: string
  who: string
  tone: string
  stats: Stat[]
  sections: { h: string; p: string }[]
  quote: string
  facts: { k: string; v: string }[]
}

// TODO(placeholder): real quote / story / person / numbers needed for every entry.
export const STORIES: Story[] = [
  {
    slug: 'design-student-portfolio-review',
    title: 'How a design student found her footing before a portfolio review',
    who: 'Sample name · Design student', tone: 'var(--ms-violet-100)',
    stats: [{ n: 8, label: 'sessions' }, { n: 3, label: 'stories came through' }, { n: 2, label: 'of practice', suffix: ' wks' }],
    sections: [
      { h: 'Where she started', p: "Placeholder text. Describe the person's starting point in their own words, with permission." },
      { h: 'How she practiced', p: 'Placeholder text about the sessions, the areas explored and the reflection.' },
      { h: 'What changed', p: 'Placeholder text about what came through clearly and the next step she chose.' },
    ],
    quote: 'Placeholder quote. Talking it through out loud made it feel real, and calm.',
    facts: [{ k: 'Who', v: 'Design student' }, { k: 'Goal', v: 'Portfolio review' }, { k: 'Used', v: 'Speak or type, Say it again' }],
  },
  {
    slug: 'teaching-to-product',
    title: 'From teaching to product: telling a new story with confidence',
    who: 'Sample name · Career switcher', tone: 'var(--ms-green-200)',
    stats: [{ n: 12, label: 'sessions' }, { n: 1, label: 'new role' }],
    sections: [
      { h: 'Where they started', p: 'Placeholder text about a career change and the worry of starting over.' },
      { h: 'How they practiced', p: 'Placeholder text about turning classroom work into stories a product team would follow.' },
      { h: 'What changed', p: 'Placeholder text about the new way of describing past work.' },
    ],
    quote: 'Placeholder quote. I stopped apologising for my old job and started describing it.',
    facts: [{ k: 'Who', v: 'Career switcher' }, { k: 'Goal', v: 'A first product role' }, { k: 'Used', v: 'Your job, your résumé' }],
  },
  {
    slug: 'hard-conversation-gently',
    title: 'Practicing a hard conversation, gently',
    who: 'Sample name · Engineer', tone: 'var(--ms-amber-50)',
    stats: [{ n: 5, label: 'sessions' }, { n: 2, label: 'next steps' }],
    sections: [
      { h: 'Where they started', p: 'Placeholder text about a conversation they had been putting off.' },
      { h: 'How they practiced', p: 'Placeholder text about answering out loud, then again.' },
      { h: 'What changed', p: 'Placeholder text about the next steps they chose.' },
    ],
    quote: 'Placeholder quote. Saying it twice showed me what I really meant.',
    facts: [{ k: 'Who', v: 'Engineer' }, { k: 'Goal', v: 'A team conversation' }, { k: 'Used', v: 'Say it again' }],
  },
  {
    slug: 'number-in-one-sentence',
    title: 'Explaining a number in one sentence',
    who: 'Sample name · Analyst', tone: '#d9fbf8',
    stats: [{ n: 4, label: 'sessions' }, { n: 1, label: 'clear sentence' }],
    sections: [
      { h: 'Where they started', p: 'Placeholder text about a result that was hard to explain simply.' },
      { h: 'How they practiced', p: 'Placeholder text about trying the sentence aloud until it sounded like them.' },
      { h: 'What changed', p: 'Placeholder text about the sentence they kept.' },
    ],
    quote: 'Placeholder quote. One plain sentence was enough.',
    facts: [{ k: 'Who', v: 'Analyst' }, { k: 'Goal', v: 'Explain a result' }, { k: 'Used', v: 'Speak or type' }],
  },
  {
    slug: 'calmer-first-interview',
    title: 'A calmer first interview',
    who: 'Sample name · Graduate', tone: '#ffd6f3',
    stats: [{ n: 6, label: 'sessions' }, { n: 3, label: 'stories' }],
    sections: [
      { h: 'Where they started', p: 'Placeholder text about nerves before a first interview.' },
      { h: 'How they practiced', p: 'Placeholder text about starting from a job post and a résumé.' },
      { h: 'What changed', p: 'Placeholder text about feeling prepared.' },
    ],
    quote: 'Placeholder quote. I knew which stories I wanted to tell.',
    facts: [{ k: 'Who', v: 'Graduate' }, { k: 'Goal', v: 'A first interview' }, { k: 'Used', v: 'Your job, your résumé' }],
  },
]

export const STORY_PAGE = {
  back: '\u2190 All journeys',
  eyebrow: 'Journey · Sample',
  tocNote: 'Sample story. Not a real person.',
  cta: 'Start your own practice',
  more: 'More journeys',
  notFoundBack: 'Journeys',
} as const
