// Glossary copy: plain words for terms that appear in MIRROR. Wording from the scaffold.

export const GLOSSARY_PAGE = {
  title: 'Glossary',
  h1: 'Practice glossary',
  sub: 'Plain words for the terms you will see in MIRROR.',
  searchLabel: 'Search terms',
  searchPlaceholder: 'Search terms',
  azLabel: 'Jump to a letter',
  empty: 'No terms match yet.',
  shown: 'terms shown',
} as const

export const TERMS: { term: string; def: string }[] = [
  { term: 'Areas to explore', def: 'Topics MIRROR suggests you talk through in a session.' },
  { term: 'Came through clearly', def: 'A part of your story that was easy to follow.' },
  { term: 'Conversation plan', def: 'The few areas a session will cover.' },
  { term: 'Deeper Questions', def: 'Gentle follow-ups that help you add detail.' },
  { term: 'Experience library', def: 'Where your work and past sessions live.' },
  { term: 'Found your footing', def: 'You started unsure and became clear.' },
  { term: 'Not enough to say yet', def: 'An honest outcome when a session was short.' },
  { term: 'Reflection Guide', def: 'The part of MIRROR that writes your reflection.' },
  { term: 'STAR shape', def: 'Situation, task, action, result: one simple story shape.' },
  { term: 'Worth revisiting', def: 'A moment to talk through again next time.' },
]
