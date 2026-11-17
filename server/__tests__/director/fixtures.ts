import type { RoomState } from '../../domain/director/types.js'

export const state = (over: Partial<RoomState> = {}): RoomState => ({
  interviewId: 'i1',
  role: 'Data Analyst',
  industry: null,
  targetId: null,
  turns: [{ question: 'Q0', answer: 'A0' }],
  asked: ['Tell me about a project you are proud of.'],
  history: [],
  gaps: [],
  storyThemes: [],
  covered: [],
  last: null,
  nextIndex: 1,
  notes: [],
  ...over,
})
