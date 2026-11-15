// The "Concept check" format: interview questions you answer by explaining, not by writing a query (keys, normalisation, ACID...).
export interface ConceptQuestion {
  id: string          // 'sql-c-...', unique across the SQL track
  topic: string       // one of conceptTopics
  level: 1 | 2 | 3
  title: string       // short, plain: 'DELETE, TRUNCATE or DROP?'
  minutes: number     // honest, 1-3
  question: string    // the question as an interviewer would ask it
  options: string[]   // exactly 4 answers, shuffled so the right one is not always first
  answer: number      // index of the right option
  why: string         // 2-3 sentences: why it is right and what the tempting wrong answers get wrong
  sayIt: string       // a model spoken answer, 2-4 plain sentences
  followUp?: string   // the interviewer's natural next question
  trap?: string       // the common misconception
  sceneId?: string    // key into ../scenes.ts for an animated explanation
}

export const conceptTopics = [
  'SQL commands and data types',
  'Keys and constraints',
  'Normalisation and design',
  'Indexes and performance',
  'Transactions and ACID',
  'Joins, sets and NULL',
] as const
