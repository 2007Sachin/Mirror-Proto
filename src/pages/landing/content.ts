// Every word on the new landing page. One source, so the page, the tests and the privacy audit read the same text.
// Rules (docs/roast-room/2026-11-17-landing-moat/verdict.md): no testimonials, counts, logos, stats, pricing, outcome promises,
// no score, percentage or streak in any mockup, no claim that the live pause reactions work, no competitor named, and every
// privacy sentence is one of CLAIMS below (checked against docs/PRIVACY-AUDIT.md).

export const NAV = {
  brand: 'MIRROR',
  links: [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how' },
    { label: 'Privacy', href: '#private' },
    { label: 'FAQ', href: '#faq' },
  ],
  cta: 'Request access',
} as const

export const HERO = {
  eyebrow: 'Interview practice for data and analytics roles',
  /** Two sentences, set as two lines: the loop, then the feeling. */
  title: ['Practise for the job you actually want.', 'Nobody is keeping score.'],
  sub: 'Paste the job description. MIRROR shows which skills your résumé backs and which it does not, asks you about the gaps by voice or in text, and lets you say every answer again.',
  primary: 'Try a sample question',
  secondary: 'Request access',
} as const

/** Plain facts under the hero. No numbers, no logos. */
export const TRUST = ['Not scored', 'No audio kept by MIRROR', 'Built from your job', 'Speak or type'] as const

/** The real app screens (public/landing/*.webp, captured from the running app with synthetic sample data). */
export const SCREENS = {
  briefing: { src: '/landing/briefing.webp', alt: 'The MIRROR Briefing: a greeting, one next step with a single button, and a coming-up card showing which skills the résumé backs, backs in part, and does not show yet.' },
  target: { src: '/landing/target.webp', alt: 'A Target page for a Senior Data Analyst role: the rounds to expect (SQL, Python, tools, behavioural) with a practise button for each, and a button to rehearse a screening call.' },
  room: { src: '/landing/room.webp', alt: 'The MIRROR interview room: a calm full-screen room with a question in large type and a side panel to speak or type an answer.' },
  session: { src: '/landing/session.webp', alt: 'A saved session: for each question, what worked, what to strengthen, and which of situation, task, action and result are in the answer.' },
  stories: { src: '/landing/stories.webp', alt: 'The Stories page: themes you can already tell, themes still open, a box to find a story for a question, and saved stories.' },
  practice: { src: '/landing/practice.webp', alt: 'The Practice page: four tracks, SQL, Python, Stats and A/B testing, and a case simulator.' },
} as const

export const HOW = {
  title: 'How it works',
  steps: [
    { title: 'Paste the job', body: 'Add the job description for the role you want. MIRROR reads what it asks for: the skills, the rounds, the kind of questions to expect.', screen: 'target' },
    { title: 'See your gaps', body: 'Your résumé is matched against the job. You see which skills it backs, which it backs in part, and which it does not show yet.', screen: 'briefing' },
    { title: 'Practise out loud', body: 'Answer in the interview room, by voice or in text. Questions follow what you said and the gaps you have, and a question does not come back.', screen: 'room' },
    { title: 'Say it again', body: 'Open a session to see what worked and what to strengthen, say an answer again, and keep the good ones as stories.', screen: 'session' },
  ],
} as const

export const FEATURES = {
  title: 'What is inside',
  intro: 'Everything below is in the app today. These are real screens, with sample data.',
  items: [
    {
      id: 'briefing', kicker: 'Briefing', title: 'One next step, chosen for you.',
      screen: 'briefing',
      body: 'Open MIRROR and it tells you what is worth doing today, in a sentence: an interview in nine days, a gap to close, a replay that is due.',
      bullets: ['One main button. Nothing competes with it.', 'Skills your résumé backs, backs in part, or does not show yet, as plain names.', 'Replays that come back sooner as the interview gets close.'],
    },
    {
      id: 'targets', kicker: 'Targets', title: 'Start from the job, not from a list.',
      body: 'Paste a job description and MIRROR reads it. You see the rounds to expect and where to start.',
      bullets: ['The rounds the role is likely to have: SQL, Python, tools and behavioural.', 'A short screening call, rehearsed from this job, with no hints.', 'Set the interview date and Briefing counts down to it.'],
      screen: 'target',
    },
    {
      id: 'room', kicker: 'Interview room', title: 'A room that listens.',
      body: 'Speak or type, in a calm full-screen room. Captions and a chat panel are there when you want them.',
      bullets: ['Questions follow what you said and the job you are after.', 'A question you have already been asked does not come back.', "MIRROR doesn't keep your audio."],
      screen: 'room',
    },
    {
      id: 'sessions', kicker: 'Sessions', title: 'Say it again and see what changed.',
      body: 'Every session is saved as a full read, question by question.',
      bullets: ['What worked and what to strengthen, in plain words.', 'Situation, task, action and result: which are in your answer and which are still open.', 'Save a good answer as a story with one tap.'],
      screen: 'briefing',  // Use briefing as fallback since there's no dedicated session screenshot
    },
    {
      id: 'stories', kicker: 'Stories', title: 'Stories you can retell.',
      body: 'A bank of real moments, in your own words, matched to what jobs ask.',
      bullets: ['Themes you can already tell, and the ones still open.', 'Paste a question and get the story that fits it.', 'A hint when the role you want needs a theme you do not have yet.'],
      screen: 'stories',
    },
    {
      id: 'practice', kicker: 'Practice', title: 'Hands-on practice for data roles.',
      body: 'Short exercises you run right in the browser. Every answer is saved and feeds your Briefing.',
      bullets: ['SQL: write real queries against a small shop and signup database, from joins to funnels.', 'Python: small functions checked against tests, in plain Python.', 'Stats and A/B testing, and a case simulator with a messy brief.'],
      screen: 'practice',
    },
  ],
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

/** Sample try-it. Nothing is sent anywhere: it plays this data on the page. */
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

export const CLOSE = {
  title: 'Bring the job you want.',
  body: 'Request access, then start with a sample or with your own job.',
  cta: 'Request access',
} as const

export const FAQ = [
  ['Is this for practising, or for recording my real interviews?', 'For practising, before the interview. MIRROR does not join your real calls.'],
  ['Do I need a job description?', 'No. You can start with one moment from your work. A job description lets MIRROR aim the practice at a role.'],
  ['Can I speak, or do I have to type?', 'Both work. When you speak, a speech service turns your voice into text while you talk. MIRROR does not keep the audio.'],
  ['Will I be given a score?', CLAIMS[1]],
  ['Who can see what I say?', CLAIMS[2]],
  ['Can I delete it?', CLAIMS[3]],
  ['Is it only for data roles?', 'It is built for data and analytics roles today.'],
  ['Is it free?', 'There is no price yet. The beta is invite-only.'],
] as const

export const FOOTER = {
  line: 'MIRROR is in beta. Practice, not a performance review.',
} as const
