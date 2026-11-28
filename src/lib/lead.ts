// The server puts a short lead-in before a question (the greeting, or a bridge such as "Thanks for walking me through that.").
// The room shows that lead-in small and keeps only the question as the heading. Matches server/domain/frame.ts.
const START = "Let's start. "
const BRIDGE = /^((?:Thanks for walking me through that|That helps me picture it|Got it, I can follow that|I appreciate the detail|That's helpful context|Understood, thank you|Last question for today, and then we'll wrap up)\.)\s+/

/** [lead-in, question]. The lead-in is '' when there is none. */
export function splitLead(text: string): [string, string] {
  const i = text.lastIndexOf(START)
  if (i >= 0) return [text.slice(0, i + START.length).trim(), text.slice(i + START.length).trim()]
  const m = BRIDGE.exec(text)
  return m ? [m[1], text.slice(m[0].length)] : ['', text]
}
