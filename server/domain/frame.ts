// The human frame around a practice interview: a greeting before the first question, a short bridge between questions,
// and a plain cue before the last one. Pure text, no model call, no scores. The question itself is never changed, only prefixed.

const GREETED = /^(hi|hello|welcome)\b/i
// A role with no real job in it (the starter profile, or nothing given).
const GENERIC = /^(interview practice|this role)$/i
const BRIDGED = /^(thanks|thank you|that helps|that's helpful|understood|good|got it|i see|appreciate|last question|one last)\b/i

/** "Data Analyst · Behavioural round" gives the job and the round; a plain role gives only the job. */
function parts(role: string): { job: string; round: string | null } {
  const [job, round] = role.split(' · ')
  return { job: job.trim() || 'this role', round: round?.trim().toLowerCase() || null }
}

/** A warm opening that says who is asking, what this is, and that nothing is scored, then the first question. */
export function greet(role: string, firstQuestion: string): string {
  if (GREETED.test(firstQuestion.trim())) return firstQuestion
  const { job, round } = parts(role)
  const what = GENERIC.test(job) ? 'today' : round ? `for this ${round} for the ${job} role` : `for the ${job} role`
  return `Hi, thanks for making time today. I'm MIRROR, and I'll be interviewing you ${what}. Nothing here is scored, so take your time and answer as you would in the real interview. Let's start. ${firstQuestion}`
}

const BRIDGES = ['Thanks for walking me through that.', "That's helpful context.", 'Understood, thank you.', 'I appreciate the detail.']

const LAST = "Last question for today, and then we'll wrap up."
// Earlier wording, still in saved interviews.
const OLD_BRIDGES = ['That helps me picture it.', 'Got it, I can follow that.']

/** The question without the greeting or bridge in front of it, so the repeat guard compares questions, not courtesy lines. */
export function stripLead(text: string): string {
  const i = text.lastIndexOf("Let's start. ")
  if (i >= 0) return text.slice(i + "Let's start. ".length)
  const lead = [...BRIDGES, ...OLD_BRIDGES, LAST].find(b => text.startsWith(`${b} `))
  return lead ? text.slice(lead.length + 1) : text
}

/** A short human line before a follow-up. `index` is the question about to be asked (1 is the second); `total` is how many there are. */
export function bridge(question: string, index: number, total: number): string {
  const q = question.trim()
  if (BRIDGED.test(q)) return q
  if (index >= total - 1) return `Last question for today, and then we'll wrap up. ${q}`
  return `${BRIDGES[(index - 1) % BRIDGES.length]} ${q}`
}

/** Practice is a warm-up plus four questions. */
export const PRACTICE_QUESTIONS = 5

/** The opening question of every practice: the way a real interview starts, and what the later questions can build on. */
export function warmUp(role: string): string {
  const { job } = parts(role)
  const target = GENERIC.test(job) ? 'the kind of role you are aiming for next' : `what draws you to the ${job} role`
  return `Before we get into the questions, tell me a little about yourself: your background, and ${target}.`
}
