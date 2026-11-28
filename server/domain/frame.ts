// The human frame around a practice interview: a greeting before the first question, a short bridge between questions,
// and a plain cue before the last one. Pure text, no model call, no scores. The question itself is never changed, only prefixed.

const GREETED = /^(hi|hello|welcome)\b/i
const BRIDGED = /^(thanks|thank you|that helps|good|got it|i see|appreciate|last question|one last)\b/i

/** "Data Analyst · Behavioural round" gives the job and the round; a plain role gives only the job. */
function parts(role: string): { job: string; round: string | null } {
  const [job, round] = role.split(' · ')
  return { job: job.trim() || 'this role', round: round?.trim().toLowerCase() || null }
}

/** A warm opening that says who is asking, what this is, and that nothing is scored, then the first question. */
export function greet(role: string, firstQuestion: string): string {
  if (GREETED.test(firstQuestion.trim())) return firstQuestion
  const { job, round } = parts(role)
  const what = round ? `a ${round} for ${job}` : `a practice conversation for ${job}`
  return `Hi, thanks for making time today. I'm MIRROR, and I'll be your interviewer for ${what}. Nothing here is scored, so take your time and answer the way you would out loud. Let's start. ${firstQuestion}`
}

const BRIDGES = ['Thanks for walking me through that.', 'That helps me picture it.', 'Got it, I can follow that.', 'I appreciate the detail.']

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
  return `Before we get into the questions, tell me a little about yourself: your background, and what draws you to ${job === 'this role' ? 'this role' : `the ${job} role`}.`
}
