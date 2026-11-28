// Home page copy. Everything here describes what the app really does; the pictures on the page are the app's own components
// (LiveOrb, FolderCard with the real interview loops, EvaluationSection) or a replica of the interview room using its labels.
// Privacy sentences are NOT here: the page renders CLAIMS from src/pages/landing/content.ts verbatim. The interviewer's lines
// follow the server's interview frame (server/domain/frame.ts). The answers and the evaluation are a sample, labelled as such.

export const SAMPLE_LABEL = 'Sample'
const ROLE = 'Product Designer'

export const HERO = {
  title: ['Practice the interview', 'before the interview.'],
  sub: ['Rehearse a realistic interview for the role you want, by voice or text.', 'Follow-up questions build on your answers, and a structured evaluation shows what to strengthen.'],
  cta: 'Start a session',
}

/** The interview room as the app shows it, played in the hero: the interviewer's lines and a sample learner's answers.
 *  Labels (timer, connection, progress, controls, panel) are the room's own. */
export const ROOM = {
  label: 'A sample of the MIRROR interview room: the interviewer asks, then listens while you answer',
  brand: 'MIRROR practice', connected: 'Connected', sampleNote: 'Sample session',
  focus: ['Getting started', 'Design decisions'],
  status: { speaking: 'MIRROR is speaking', listening: 'Listening to you', thinking: 'Thinking about it' },
  controls: ['Mute', 'Captions', 'Chat', 'Repeat', 'Pause'],
  send: 'Send answer', later: 'Continue later', end: 'End session',
  tabs: ['Chat', 'Tips', 'Replay'], modes: ['Speak', 'Type'],
  foot: "Saved as you go. MIRROR doesn't keep your audio.",
  interviewer: 'MIRROR',
  you: 'You',
  script: [
    { who: 'mirror', text: `Hi, thanks for making time today. I'm MIRROR, and I'll be interviewing you for this behavioural round for the ${ROLE} role. Let's start. Before we get into the questions, tell me a little about yourself: your background, and what draws you to the ${ROLE} role.` },
    { who: 'you', text: "I'm a designer at a small payments startup. I've spent the last few years on onboarding, and I want to lead design on a bigger product." },
    { who: 'mirror', text: 'Thanks for walking me through that. Tell me about a time you changed a design after seeing how people used it.' },
    { who: 'you', text: 'I watched recorded sign-up sessions and saw people stall at the bank-linking step, so we decided to move it later. More people finished sign-up after that.' },
  ] as { who: 'mirror' | 'you'; text: string }[],
}

export const PILLARS = {
  title: ['Everything you need', 'before the real one'],
  items: [
    { id: 'prep', name: 'Interview Prep', text: 'Choose a role or paste a job description to get the rounds of that interview loop.', colors: ['#ffbd7e', '#ffeed8', '#dc93c3'], dot: ['#ffbd7e', '#dc93c3'] },
    { id: 'room', name: 'The interview room', text: 'A structured interview by voice or text, with follow-up questions based on your answers.', colors: ['#f0c0ff', '#ffeed8', '#c8c4ea'], dot: ['#f0c0ff', '#c8c4ea'] },
    { id: 'evaluation', name: 'Your evaluation', text: 'Structure, specificity, ownership and result, in clear levels tied to your own words.', colors: ['#b7efb2', '#ffeed8', '#79e7dc'], dot: ['#b7efb2', '#79e7dc'] },
    { id: 'stories', name: 'Stories', text: 'A library of your strongest examples, ready for the questions that call for them.', colors: ['#ffeed8', '#ffe4ff', '#c8c4ea'], dot: ['#ffeed8', '#c8c4ea'] },
  ] as { id: string; name: string; text: string; colors: [string, string, string]; dot: [string, string] }[],
  sideLabel: 'Sections',
}

export interface FeatureSection { id: string; eyebrow: string; title: string[]; text: string; colors: [string, string, string] }
export const SECTIONS: FeatureSection[] = [
  { id: 'prep', eyebrow: 'Interview Prep', title: ['Practice every round', 'of the interview loop'], text: 'Each role includes its interview rounds and what each round looks for. Bring a specific job and MIRROR aligns it with your résumé and recommends the rounds to prepare.', colors: ['#ffbd7e', '#ffeed8', '#dc93c3'] },
  { id: 'room', eyebrow: 'The interview room', title: ['A realistic interview,', 'with real follow-ups'], text: 'Each session opens with a short introduction and a warm-up question, then moves into role-specific questions that build on what you say. Answer by voice or text, with live captions.', colors: ['#f0c0ff', '#ffeed8', '#c8c4ea'] },
  { id: 'evaluation', eyebrow: 'Your evaluation', title: ['A structured evaluation', 'after every session'], text: 'Your answers are reviewed for structure, specificity, ownership and result. For each, you see the level, the exact line it is based on, and one concrete improvement, described in clear levels rather than numbers.', colors: ['#b7efb2', '#ffeed8', '#79e7dc'] },
  { id: 'stories', eyebrow: 'Stories', title: ['Your strongest examples,', 'ready to use'], text: 'Keep your best experiences in your own words. When a question matches a theme, the right story is ready to retell.', colors: ['#ffeed8', '#ffe4ff', '#c8c4ea'] },
]

/** The room's steps, in the order the server runs them. */
export const ROOM_STEPS = [
  ['Introduction', 'The interviewer sets out the role, the round and the format.'],
  ['Warm-up', 'A short question about your background and what you are aiming for.'],
  ['Role-specific questions', 'Each follow-up builds on your previous answer.'],
  ['Closing question', 'A clear signal before the final question, then the session ends.'],
] as [string, string][]

/** A sample evaluation of the answers in ROOM; quotes are exact pieces of those answers, as the real check requires. */
export const SAMPLE_EVALUATION = [
  { competency: 'structure', level: 'clear', quote: 'I watched recorded sign-up sessions and saw people stall at the bank-linking step', observation: 'The situation and your action are clear.', fix: 'Close with one line on the outcome for users.' },
  { competency: 'specificity', level: 'strong', quote: 'people stall at the bank-linking step', observation: 'You named the exact step where users dropped off.', fix: 'Bring the same precision to your other answers.' },
  { competency: 'ownership', level: 'starting', quote: 'so we decided to move it later', observation: 'The key decision is framed as a team decision, so your own contribution is unclear.', fix: 'State which part of the change you proposed and championed.' },
  { competency: 'result', level: 'clear', quote: 'More people finished sign-up after that.', observation: 'There is an outcome, but not how it was measured.', fix: 'Name the measure you used to confirm the change.' },
] as { competency: string; level: 'starting' | 'clear' | 'strong'; quote: string; observation: string; fix: string }[]

export const STORIES_PANEL = {
  head: 'Your stories', themesLabel: 'Themes',
  themes: ['Ownership', 'Collaboration', 'Difficult decisions', 'Learning from users'],
  items: [
    { title: 'Moving the bank-linking step', theme: 'Learning from users', line: 'I watched recorded sign-up sessions and saw people stall at the bank-linking step.' },
    { title: 'Delaying a launch by a week', theme: 'Difficult decisions', line: 'I asked to move the launch by a week so we could fix the error states first.' },
  ],
}

export const PRIVACY = {
  eyebrow: 'Privacy',
  title: 'Your practice stays yours',
  badges: ['Private', 'Yours'],
  // Headings only; the body of each card is a CLAIMS sentence (indexes into CLAIMS).
  cards: [{ h: 'Your audio', claim: 0 }, { h: 'Sharing', claim: 2 }, { h: 'Your data', claim: 3 }],
}

export const FAQ = {
  title: 'Questions, answered plainly',
  items: [
    { q: 'What is MIRROR?', a: 'An interview practice platform. Choose a role or bring a job description, complete a realistic interview by voice or text, and review a structured evaluation of your answers.' },
    { q: 'Can I type instead of speaking?', a: 'Yes. Every session supports both voice and text, and you can switch at any time.' },
    { q: 'Do I need a résumé?', a: 'No. A résumé is only used when you prepare for a specific job, to align your experience with the role.' },
  ],
  // Questions whose answers are CLAIMS sentences (claim = index into CLAIMS).
  privacyItems: [
    { q: 'Does MIRROR keep my audio?', claim: 0 },
    { q: 'How is my practice evaluated?', claim: 1 },
    { q: 'Who can see my practice?', claim: 2 },
    { q: 'Can I remove my data?', claim: 3 },
  ],
}
