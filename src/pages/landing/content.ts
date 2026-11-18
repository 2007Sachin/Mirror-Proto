// Every word on the new landing page. One source, so the page, the tests and the privacy audit read the same text.
// Rules (docs/roast-room/2026-11-17-landing-moat/verdict.md): no testimonials, counts, logos, stats, pricing, outcome promises,
// no score, percentage or streak in any mockup, no claim that the live pause reactions work, no competitor named, and every
// privacy sentence is one of CLAIMS below (checked against docs/PRIVACY-AUDIT.md).

export const NAV = {
  brand: 'MIRROR',
  links: [
    { label: 'How it works', href: '#how' },
    { label: 'Privacy', href: '#private' },
  ],
  cta: 'Request access',
} as const

export const HERO = {
  eyebrow: 'Interview practice for data roles',
  /** Two sentences, set as two lines: the loop, then the feeling. */
  title: ['Practise for the job you actually want.', 'Nobody is keeping score.'],
  sub: 'Paste the job description. MIRROR shows where your résumé is thin, asks about it, and lets you say it again.',
  primary: 'Try a sample question',
  secondary: 'Request access',
} as const

export const MOMENT = {
  title: 'The night before the call.',
  body: [
    'You know your work. What is hard is saying it, in a sensible order, to someone who is not on your side yet.',
    'A list of questions does not know which job you are after. MIRROR starts from the job.',
  ],
} as const

export const STEPS = [
  { title: 'Paste the job', body: 'Paste the job description. MIRROR reads what the role asks for.' },
  { title: 'See the gaps', body: 'Your résumé is matched against it. You see which skills it backs, which it backs in part, and which it does not show yet.' },
  { title: 'Say it again', body: 'You are asked about the gaps. Answer out loud or in text, then say it again and see what changed.' },
] as const

export const SESSION = {
  title: 'What a session looks like.',
  intro: 'This is a sample target, drawn the way the app shows it. Your own job will have its own gaps.',
  target: 'Data Analyst, sample company',
  groups: [
    { label: 'Your résumé backs', tone: 'covered', skills: ['SQL joins', 'Python', 'Excel'] },
    { label: 'Partly', tone: 'partial', skills: ['Stakeholder communication'] },
    { label: 'Not shown yet', tone: 'gap', skills: ['Window functions', 'A/B testing'] },
  ],
  probeLabel: 'A question about the first gap',
  probe: 'Tell me about a time you ranked or compared rows in SQL. What was the question, and what did the result change?',
  note: 'Skill names only. Nothing here is a grade.',
} as const

/** The sample try-it. Nothing is sent anywhere: it plays this data on the page. */
export const SAMPLE = {
  tag: 'sample',
  label: 'Sample, not your data. Nothing you tap here leaves this page.',
  title: 'Try a sample question.',
  intro: 'Pick how you might start an answer. Then say it again.',
  question: 'Tell me about a time you ranked or compared rows in SQL. What was the question, and what did the result change?',
  chooseLabel: 'Start with',
  againButton: 'Say it again',
  changedLabel: 'What changed',
  closing: 'Now do it for the job you want.',
  closingCta: 'Request access',
  answers: [
    {
      id: 'reports',
      first: 'I helped with the reports and it went fine, I think.',
      again: 'I rebuilt the weekly revenue report in SQL and ranked customers with a window function. Finance stopped asking for manual fixes.',
      changed: ['The task is named', 'The result is now included'],
    },
    {
      id: 'dashboards',
      first: 'We had a lot of dashboards and I worked on some of them with the team.',
      again: 'I owned the sales dashboard. I rewrote the slow queries, and the page now loads before the Monday meeting starts.',
      changed: ['Your part is clear', 'The outcome is there'],
    },
    {
      id: 'sql',
      first: 'I did some SQL for the finance team.',
      again: 'I wrote the SQL that ranked our top customers each month. Finance used the list to plan outreach, and it replaced a spreadsheet.',
      changed: ['The question is stated', 'What it replaced is named'],
    },
  ],
} as const

export const NOT_SCORED = {
  title: 'Not scored, on purpose.',
  body: 'Practice is where you are allowed to be unsure. So nothing you say in an interview here is given a grade, a percentage or a streak. You see what came through and what changed, and that is all.',
} as const

/** The only privacy and scoring sentences that may appear, word for word (docs/PRIVACY-AUDIT.md rows 1, 5, 6, 7 and 9). */
export const CLAIMS = [
  "MIRROR doesn't keep your audio. The speech service that turns your voice into text hears it live, while you talk.",
  'Your interview answers, spoken or typed, never get a score. Practice problems with one right answer, such as SQL, are simply marked correct or not.',
  'MIRROR has no sharing feature. Nothing is sent to employers or recruiters, and nobody else signed in to MIRROR can open your practice.',
  'You can delete your practice data and export it. Your sign-in account stays, and backups held by the database provider are outside our control.',
  'Your answers and résumé text go to a language-model service for notes and questions.',
] as const

export const PRIVATE = {
  title: 'Private, with limits.',
  intro: 'Here is what is true today, including the parts that are not perfect.',
} as const

export const VERSUS = {
  title: 'A list of questions, and a list built from your job.',
  left: 'A question list',
  right: 'Built from your job',
  rows: [
    ['Asks the same things of everyone.', 'Asks about the gaps between your résumé and this job.'],
    ['Starts from nothing every time.', 'Remembers what it has already asked you, so a question does not come back.'],
    ['Ends when you stop.', 'Lets you say an answer again and shows what changed.'],
  ],
} as const

export const STAGE = {
  title: 'Where we are.',
  body: [
    'MIRROR is in a small, invite-only beta. You can type your answers or speak them.',
    'Some things are still being tried quietly. For example, how the interviewer reacts to a long pause is not switched on for anyone yet. We would rather tell you than imply it.',
  ],
} as const

export const FAQ = [
  ['Do I need a job description?', 'No. You can start with one moment from your work. A job description lets MIRROR aim the practice at a role.'],
  ['Can I speak, or do I have to type?', 'Both work. When you speak, a speech service turns your voice into text while you talk. MIRROR does not keep the audio.'],
  ['Will I be given a score?', CLAIMS[1]],
  ['Who can see what I say?', CLAIMS[2]],
  ['Can I delete it?', CLAIMS[3]],
  ['Is it free?', 'There is no price yet. The beta is invite-only.'],
] as const

export const CLOSE = {
  title: 'Bring the job you want.',
  body: 'Request access, then start with a sample or with your own job.',
  cta: 'Request access',
} as const

export const FOOTER = {
  line: 'MIRROR is in beta. Practice, not a performance review.',
} as const
