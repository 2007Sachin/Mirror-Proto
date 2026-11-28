// Home page copy. Everything here describes what the app really does; the pictures on the page are the app's own components
// (LiveOrb, FolderCard with the real interview loops, EvaluationSection). Privacy sentences are NOT here: the page renders
// CLAIMS from src/pages/landing/content.ts verbatim. The interviewer's lines follow the server's interview frame
// (server/domain/frame.ts greet, warmUp, bridge). The answers and the evaluation are a made-up example, labelled "Sample".

export const SAMPLE_LABEL = 'Sample'
const ROLE = 'Product Designer'

export const HERO = {
  title: ['Practice the interview', 'before the interview.'],
  sub: ['Pick the role you want. An interviewer greets you, asks real questions and follows up on what you say,', 'then shows how your answers read, in your own words.'],
  cta: 'Start a session',
}

/** The interview room, played in the hero: the interviewer's lines, a sample learner's answers. */
export const ROOM = {
  label: 'A sample of the interview room: the interviewer speaks, then listens while you answer',
  bar: `Interview room · ${ROLE} · Behavioural round`,
  sampleNote: 'Sample answers',
  interviewer: 'MIRROR',
  you: 'You',
  script: [
    { who: 'mirror', text: `Hi, thanks for making time today. I'm MIRROR, and I'll be your interviewer for a behavioural round for ${ROLE}. Let's start. Before we get into the questions, tell me a little about yourself: your background, and what draws you to the ${ROLE} role.` },
    { who: 'you', text: "I'm a designer at a small payments startup. I've spent the last few years on onboarding, and I want to lead design on a bigger product." },
    { who: 'mirror', text: 'Thanks for walking me through that. Tell me about a time you changed a design after seeing how people used it.' },
    { who: 'you', text: 'I watched recorded sign-up sessions and saw people stall at the bank-linking step, so we decided to move it later. More people finished sign-up after that.' },
  ] as { who: 'mirror' | 'you'; text: string }[],
}

export const PILLARS = {
  title: ['Everything you need', 'before the real one'],
  items: [
    { id: 'prep', name: 'Interview Prep', text: 'Pick a role or paste a job. You get the rounds of that interview loop to practice.', colors: ['#ffbd7e', '#ffeed8', '#dc93c3'], dot: ['#ffbd7e', '#dc93c3'] },
    { id: 'room', name: 'The interview room', text: 'A greeting, a warm-up, then questions that follow up on what you said. Speak or type.', colors: ['#f0c0ff', '#ffeed8', '#c8c4ea'], dot: ['#f0c0ff', '#c8c4ea'] },
    { id: 'evaluation', name: 'Your evaluation', text: 'Structure, specificity, ownership and result, in plain levels, each with the line you said.', colors: ['#b7efb2', '#ffeed8', '#79e7dc'], dot: ['#b7efb2', '#79e7dc'] },
    { id: 'stories', name: 'Stories', text: 'Your best moments in your own words, ready to retell when a question calls for one.', colors: ['#ffeed8', '#ffe4ff', '#c8c4ea'], dot: ['#ffeed8', '#c8c4ea'] },
  ] as { id: string; name: string; text: string; colors: [string, string, string]; dot: [string, string] }[],
  sideLabel: 'Sections',
}

export interface FeatureSection { id: string; eyebrow: string; title: string[]; text: string; colors: [string, string, string] }
export const SECTIONS: FeatureSection[] = [
  { id: 'prep', eyebrow: 'Interview Prep', title: ['Practice the rounds', 'of a real interview loop'], text: 'Each role comes with its rounds and what each one looks for. Bring your own job and MIRROR lines it up with your résumé and suggests rounds.', colors: ['#ffbd7e', '#ffeed8', '#dc93c3'] },
  { id: 'room', eyebrow: 'The interview room', title: ['An interviewer that', 'listens and follows up'], text: 'It greets you, starts with a warm-up about you, then asks questions that build on your answers. Speak or type, and see your words as you say them.', colors: ['#f0c0ff', '#ffeed8', '#c8c4ea'] },
  { id: 'evaluation', eyebrow: 'Your evaluation', title: ['How your answers read,', 'in your own words'], text: 'After each session: a level in words for structure, specificity, ownership and result, the line you said that shows it, and one thing to try. Never a number.', colors: ['#b7efb2', '#ffeed8', '#79e7dc'] },
  { id: 'stories', eyebrow: 'Stories', title: ['Stories you', 'can retell'], text: 'Real moments in your own words. A role can use a story when the theme matches what the job asks for.', colors: ['#ffeed8', '#ffe4ff', '#c8c4ea'] },
]

/** The room's steps, in the order the server runs them. */
export const ROOM_STEPS = [
  ['A greeting', 'Who is asking, which round this is, and that you can take your time.'],
  ['A warm-up', 'Tell me a little about yourself, the way a real interview starts.'],
  ['Questions that follow up', 'Each one builds on what you just said.'],
  ['A plain last question', 'You hear when it is the last one, then the session wraps up.'],
] as [string, string][]

/** A sample evaluation of the answers in ROOM; quotes are exact pieces of those answers, as the real check requires. */
export const SAMPLE_EVALUATION = [
  { competency: 'structure', level: 'clear', quote: 'I watched recorded sign-up sessions and saw people stall at the bank-linking step', observation: 'There is a situation and what you did about it.', fix: 'Add one line on how it ended for the people signing up.' },
  { competency: 'specificity', level: 'strong', quote: 'people stall at the bank-linking step', observation: 'You named the exact step where people got stuck.', fix: 'Keep this kind of detail in your other answers.' },
  { competency: 'ownership', level: 'starting', quote: 'so we decided to move it later', observation: 'The key decision is told as we, so your own part is not clear yet.', fix: 'Say which part of the change you proposed and argued for.' },
  { competency: 'result', level: 'clear', quote: 'More people finished sign-up after that.', observation: 'There is an outcome, but not how you knew it.', fix: 'Name what you looked at to see the change.' },
] as { competency: string; level: 'starting' | 'clear' | 'strong'; quote: string; observation: string; fix: string }[]

export const STORIES_PANEL = {
  head: 'Your stories', themesLabel: 'Themes',
  themes: ['Ownership', 'Working with others', 'A hard decision', 'Learning from users'],
  items: [
    { title: 'Moving the bank step', theme: 'Learning from users', line: 'I watched recorded sign-up sessions and saw people stall at the bank-linking step.' },
    { title: 'Asking for one more week', theme: 'A hard decision', line: 'I asked to move the launch by a week so we could fix the error states first.' },
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
    { q: 'What is MIRROR?', a: 'A place to practice interviews out loud. Pick a role or bring a job, answer an interviewer that follows up, then read how your answers came across.' },
    { q: 'Do I have to speak?', a: 'No. You can speak your answers or type them, whichever feels better today.' },
    { q: 'Do I need a résumé?', a: 'No. You can start with one question about yourself. A résumé helps only when you bring a specific job.' },
  ],
  // Questions whose answers are CLAIMS sentences (claim = index into CLAIMS).
  privacyItems: [
    { q: 'Does MIRROR keep my audio?', claim: 0 },
    { q: 'How is my practice evaluated?', claim: 1 },
    { q: 'Who can see my practice?', claim: 2 },
    { q: 'Can I remove my data?', claim: 3 },
  ],
}
