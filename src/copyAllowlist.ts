// Learner-visible strings that may keep a banned pattern. Keep this list short and give a reason.
// `where` is matched against the label the scanner reports (screen name or data path);
// `pattern` is matched against the offending text. An entry covers every hit that matches both.
export interface AllowEntry { where: RegExp; pattern: RegExp; reason: string }

export const allowlist: AllowEntry[] = [
  {
    where: /^today:/,
    pattern: /^one question$/i,
    reason: 'The new-user greeting on Today (from the redesign spec). It invites a first step; it is not a promised count of questions in a session.',
  },
  {
    where: /^data:stats items/,
    pattern: /\d\s?%|\bpercent\b|\bof \d/i,
    reason: 'The statistics drill teaches conversion rates and p-values, so the numbers are the subject of the question. They are quiz data, not a score or a claim about the learner.',
  },
  {
    // The pattern chip and title are UI chrome, so they stay strict. "Step N of M" is never allowed.
    where: /^data:sql problems\[\d+\]\.(prompt|scenario|followUp|explain|hint|edgeCases)/,
    pattern: /^(?!.*\bStep \d+ of \d+\b).*(\bpercent(age)?\b|\bof \d+\b|\d%)/is,
    reason: 'SQL task wording. A task that asks for a share must say it is on a 0 to 100 scale, and tasks name parameters such as "streaks of 3 days" or "a difference of 1". They are not counts of questions or steps, and not a displayed result.',
  },
  {
    where: /^data:(concepts|curriculum|python problems)/,
    pattern: /\bof \d+\b|\d%|\bpercent(age)?\b/i,
    reason: 'Teaching text about a data value or a SQL feature, for example "95% of rows are true" for index selectivity, or "percent change". Not a progress or score figure.',
  },
]
