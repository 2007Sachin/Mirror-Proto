import type { Level } from '../types'
import { familyWise, mean, median, sampleSizePerArm, srm, twoProp } from './math'

// Every number in the text below is computed here from math.ts, so the words cannot drift from the maths.
export interface Option { text: string; why: string }
export interface StatsItem {
  id: string; topic: string; level: Level; title: string; minutes: number
  scenario: string; question: string
  options: Option[]
  best: number // index of the one best option
  summary: string
  working?: string[] // set on numeric items: shown under "Show the working"
}

const n = (x: number) => x.toLocaleString('en-US')
const pc = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`
const pts = (x: number) => (x * 100).toFixed(2)
const pv = (p: number) => (p < 0.001 ? '< 0.001' : `= ${p.toFixed(3)}`)

// 1. Mean vs median
const orders = [24, 26, 28, 30, 31, 33, 35, 38, 40, 950]
const oMean = mean(orders), oMed = median(orders)

// 2. Average of rates
const mobU = 1000, mobC = 50, deskU = 200, deskC = 20
const naive = (mobC / mobU + deskC / deskU) / 2, real = (mobC + deskC) / (mobU + deskU)

// 3. First read of a test
const t1 = twoProp(820, 20000, 900, 20000)
// 4. What a p-value says
const t2 = twoProp(500, 10000, 570, 10000)
// 5. Interval that touches zero
const t3 = twoProp(1000, 20000, 1080, 20000)
// 6/7. Sample size
const perArm = sampleSizePerArm(0.04, 0.045), perDay = 3000, days = Math.ceil((2 * perArm) / perDay)
const perArmHalf = sampleSizePerArm(0.04, 0.0425)
// 8. Small test
const t4 = twoProp(8, 200, 11, 200), need4 = sampleSizePerArm(0.04, 0.055)
// 9. Many metrics
const fw = familyWise(20)
// 10. SRM
const s = srm([52000, 48000])
// 11. Peeking
const day5 = twoProp(400, 10000, 462, 10000), day14 = twoProp(1120, 28000, 1198, 28000)
// 12. Novelty
const w1 = twoProp(1000, 10000, 1200, 10000), w2 = twoProp(1010, 10000, 1040, 10000)
// 13. Small real lift
const t5 = twoProp(50000, 1000000, 51500, 1000000)
// 14. Guardrail
const gp = twoProp(1500, 50000, 1650, 50000), gg = twoProp(500, 50000, 650, 50000)

export const items: StatsItem[] = [
  {
    id: 'stats-mean-vs-median', topic: 'Descriptive stats', level: 1, title: 'Average order value with one huge order', minutes: 3,
    scenario: `A shop sends you ten order values from today, in dollars: ${orders.join(', ')}. The finance lead wants one number for "what a typical order looks like".`,
    question: 'Which number should you report as the typical order?',
    options: [
      { text: `The median, ${oMed} dollars`, why: `Right. Nine of ten orders sit between 24 and 40 dollars, and the median of ${oMed} describes them. One giant order cannot drag the median around.` },
      { text: `The mean, ${oMean} dollars`, why: `Tempting because "average" usually means the mean. But one 950 dollar order lifts it to ${oMean}, a value that none of the nine ordinary orders is anywhere near.` },
      { text: 'Both, and let the finance lead choose', why: 'Showing both is fine as a footnote, but you were asked for one typical number. The job is to pick the one that is honest here.' },
      { text: 'Drop the 950 order and report the mean', why: `Tempting, but deleting data because it is inconvenient hides a real customer. Report the median and mention the large order.` },
    ],
    best: 0,
    summary: 'When a few values are far larger than the rest, the median tells you what is typical and the mean tells you about the total.',
    working: [`Mean = ${orders.reduce((a, b) => a + b, 0)} / ${orders.length} = ${oMean}`, `Median = middle of the sorted values = (31 + 33) / 2 = ${oMed}`],
  },
  {
    id: 'stats-average-of-rates', topic: 'Descriptive stats', level: 2, title: 'Averaging two conversion rates', minutes: 4,
    scenario: `Mobile had ${n(mobU)} visitors and ${mobC} signups (${pc(mobC / mobU)}). Desktop had ${n(deskU)} visitors and ${deskC} signups (${pc(deskC / deskU)}). A teammate says the overall rate is the average of the two, ${pc(naive, 2)}.`,
    question: 'What is the overall signup rate?',
    options: [
      { text: `${pc(naive, 2)}, the average of the two rates`, why: `Tempting because it is quick. But it treats a group of ${n(deskU)} the same as a group of ${n(mobU)}. Desktop is small, yet it gets half the say.` },
      { text: `${pc(real, 2)}, total signups over total visitors`, why: `Right. Add up all signups (${mobC + deskC}) and all visitors (${n(mobU + deskU)}). Each visitor counts once, so the bigger group counts for more.` },
      { text: `${pc(deskC / deskU)}, because desktop converts best`, why: 'The best segment is not the overall rate. It ignores the larger mobile group completely.' },
      { text: 'It cannot be known without the daily numbers', why: 'The totals are enough. Daily numbers would only matter if you wanted a trend.' },
    ],
    best: 1,
    summary: 'Combine counts, not rates. A rate is only meaningful with its denominator.',
    working: [`Naive: (${pc(mobC / mobU)} + ${pc(deskC / deskU)}) / 2 = ${pc(naive, 2)}`, `Correct: (${mobC} + ${deskC}) / (${n(mobU)} + ${n(deskU)}) = ${pc(real, 2)}`],
  },
  {
    id: 'stats-first-read', topic: 'Hypothesis tests', level: 1, title: 'A borderline test result', minutes: 4,
    scenario: `An A/B test ran on ${n(20000)} users per group. Control converted ${pc(t1.p1)} (820 users), the variant ${pc(t1.p2)} (900 users). The two-proportion test gives p ${pv(t1.p)}. The 95% interval for the lift runs from ${pts(t1.ci[0])} to ${pts(t1.ci[1])} percentage points.`,
    question: 'What is the fairest reading?',
    options: [
      { text: 'Not significant, since 0.4 points is a tiny lift', why: `Tempting because the lift looks small. But significance depends on the p-value, and p ${pv(t1.p)} is just under 0.05. Small and significant can go together.` },
      { text: 'Proven: the variant adds exactly 0.4 points', why: 'The 0.4 is the measured gap, not a fixed truth. The interval shows the real lift could be anywhere from about zero to 0.8 points.' },
      { text: `Just significant: probably a real lift, but it could be close to zero`, why: `Right. p ${pv(t1.p)} clears 0.05 by a hair, and the interval starts at ${pts(t1.ci[0])}. Say it is promising, name the range, and decide with the cost in mind.` },
      { text: `There is a ${pc(t1.p)} chance the variant is no better`, why: 'A very common misreading. A p-value is about how surprising the data is if there were no difference. It is not the chance that the variant is useless.' },
    ],
    best: 2,
    summary: 'Read the p-value and the interval together. The interval shows how big or small the lift could really be.',
    working: [`z = ${t1.z.toFixed(3)}, p ${pv(t1.p)}`, `Difference = ${pts(t1.diff)} points, 95% interval ${pts(t1.ci[0])} to ${pts(t1.ci[1])} points`],
  },
  {
    id: 'stats-p-value-meaning', topic: 'Hypothesis tests', level: 1, title: 'What a p-value of 0.03 says', minutes: 3,
    scenario: `A new onboarding email: ${n(10000)} users per group, 500 signed up in control and 570 in the variant. The test reports p = ${t2.p.toFixed(2)}.`,
    question: 'Which sentence about that p-value is correct?',
    options: [
      { text: `There is a ${pc(1 - t2.p, 0)} chance the variant really works`, why: 'Tempting, because it flips the number into good news. A p-value does not give the chance that the variant works.' },
      { text: 'If the email did nothing, a gap this big or bigger would show up only about 3 times in 100 tests like this', why: 'Right. That is what a p-value is: how surprising the data would be if there were no real difference.' },
      { text: 'The variant lifts signups by 3 percent', why: 'Mixes up two different numbers. The p-value says nothing about the size of the lift. The gap in rates does.' },
      { text: 'Three percent of users were affected by the email', why: 'The p-value is not about users. It is about how the result compares with pure chance.' },
    ],
    best: 1,
    summary: 'A p-value measures surprise under "no difference". It is not the chance you are right and not the size of the effect.',
    working: [`Rates: ${pc(t2.p1)} and ${pc(t2.p2)}, z = ${t2.z.toFixed(3)}, p = ${t2.p.toFixed(3)}`],
  },
  {
    id: 'stats-interval-zero', topic: 'Hypothesis tests', level: 2, title: 'A lift whose interval touches zero', minutes: 5,
    scenario: `A checkout button test with ${n(20000)} users per group. Control: 1,000 purchases (${pc(t3.p1)}). Variant: 1,080 purchases (${pc(t3.p2)}). The 95% interval for the difference is ${pts(t3.ci[0])} to ${pts(t3.ci[1])} points and p ${pv(t3.p)}. A manager says "it won, ship it."`,
    question: 'What do you tell the manager?',
    options: [
      { text: 'Ship it: the variant has more purchases', why: 'Tempting because the variant did get more purchases. But with this much random wobble, a gap of this size can appear even when the button does nothing.' },
      { text: 'The variant is worse, since the interval has a negative end', why: 'The negative end is just the edge of what is plausible, and it is almost zero. It does not show harm.' },
      { text: 'This test cannot separate the button from chance. It is not a win yet.', why: `Right. The interval runs from ${pts(t3.ci[0])} to ${pts(t3.ci[1])} points, so "no change" is still plausible, and p ${pv(t3.p)} is above 0.05. Extend the test or accept that the effect is small.` },
      { text: 'Run a different test, since this one failed', why: 'The test did not fail. It gave an honest answer: it is not sure. Switching tests until one wins is how false wins happen.' },
    ],
    best: 2,
    summary: 'If the interval includes zero, the data does not rule out "no effect". Report the range, not just the gap.',
    working: [`Difference = ${pts(t3.diff)} points`, `95% interval = ${pts(t3.ci[0])} to ${pts(t3.ci[1])} points`, `z = ${t3.z.toFixed(3)}, p ${pv(t3.p)}`],
  },
  {
    id: 'stats-sample-size', topic: 'Power and sample size', level: 1, title: 'How long should the test run?', minutes: 5,
    scenario: `Your conversion rate is 4.0%. You want to be able to detect a lift to 4.5%, using the usual settings (5% significance, 80% power). The site gets ${n(perDay)} eligible users a day, split evenly across two groups.`,
    question: 'About how long must the test run?',
    options: [
      { text: 'About 3 days, since 3,000 users is plenty', why: 'Tempting because 3,000 sounds like a lot. At a rate near 4%, that is only about 60 conversions per group per day, too few to see a half-point change in one day.' },
      { text: `About ${days} days, since each group needs about ${n(perArm)} users`, why: `Right. The size formula gives about ${n(perArm)} users per group, ${n(2 * perArm)} in total. At ${n(perDay)} a day that is about ${days} days.` },
      { text: 'Until the result turns significant', why: 'Tempting and common, but stopping when it looks good inflates false wins. Decide the size before you start.' },
      { text: 'One week, because tests always run a week', why: 'A week is a sensible minimum for weekday patterns, but the size comes from the lift you want to detect, not the calendar.' },
    ],
    best: 1,
    summary: 'Size comes from the base rate and the smallest lift you care about. Calculate it before launch.',
    working: [`Per group: ceil((1.96 + 0.84)^2 x (0.04 x 0.96 + 0.045 x 0.955) / 0.005^2) = ${n(perArm)}`, `Total ${n(2 * perArm)} users / ${n(perDay)} a day = ${(2 * perArm / perDay).toFixed(1)}, so ${days} days`],
  },
  {
    id: 'stats-half-effect', topic: 'Power and sample size', level: 2, title: 'Detecting a smaller lift', minutes: 5,
    scenario: `The plan was to detect 4.0% to 4.5%, which needs about ${n(perArm)} users per group. The PM now says the team would also care about a lift to just 4.25%, half as large.`,
    question: 'Roughly how many users per group does the smaller lift need?',
    options: [
      { text: `About half as many, around ${n(Math.round(perArm / 2))}`, why: 'Tempting, because a smaller effect feels cheaper to check. It is the reverse: smaller effects are harder to see.' },
      { text: `About the same, around ${n(perArm)}`, why: 'The size depends strongly on the lift. It does not stay put when the lift changes.' },
      { text: `About four times as many, around ${n(perArmHalf)}`, why: `Right. The gap sits in the denominator squared, so halving the lift needs about four times the users. The formula gives ${n(perArmHalf)}.` },
      { text: 'About twice as many, around ' + n(perArm * 2), why: 'Tempting, because halving suggests doubling. But the lift is squared in the formula, so the cost grows faster.' },
    ],
    best: 2,
    summary: 'Users needed grow with the square of how small the lift is. Halve the lift and you need about four times the traffic.',
    working: [`4.0% to 4.5%: ${n(perArm)} per group`, `4.0% to 4.25%: ${n(perArmHalf)} per group`, `Ratio = ${(perArmHalf / perArm).toFixed(2)}`],
  },
  {
    id: 'stats-small-test', topic: 'Power and sample size', level: 2, title: 'A small test with no result', minutes: 5,
    scenario: `A quick test on ${n(200)} users per group: control had 8 conversions (${pc(8 / 200)}), the variant 11 (${pc(11 / 200)}). The test gives p = ${t4.p.toFixed(2)}. A colleague writes in the report: "the new design has no effect."`,
    question: 'What is the right correction?',
    options: [
      { text: '"No effect" is right: p is far above 0.05', why: 'Tempting, since a large p-value feels like proof of nothing. It only means this small test could not tell.' },
      { text: '"Not enough data to say." The test was too small to see a lift this size.', why: `Right. To detect 4.0% to 5.5% you would need about ${n(need4)} users per group. With 200, even a real lift would usually be missed.` },
      { text: '"The variant is better: 11 is more than 8"', why: 'With counts this small, that gap shows up by luck all the time.' },
      { text: '"The variant is worse because p is large"', why: 'A large p-value does not point either way. It only says the data is not surprising under "no difference".' },
    ],
    best: 1,
    summary: 'No significant result is not the same as no effect. A small test often cannot see an effect that is really there.',
    working: [`z = ${t4.z.toFixed(3)}, p = ${t4.p.toFixed(3)}`, `Needed per group for 4.0% to 5.5%: ${n(need4)}`],
  },
  {
    id: 'stats-many-metrics', topic: 'A/B test pitfalls', level: 3, title: 'One green metric out of twenty', minutes: 6,
    scenario: 'The test dashboard shows 20 metrics: clicks, pages per visit, search use, and so on. The headline metric is flat. One secondary metric, "saved items", has p = 0.04. A designer wants to announce "the new layout increases saves".',
    question: 'How should you treat that result?',
    options: [
      { text: 'Announce it: p is below 0.05', why: 'Tempting, because the rule says p below 0.05 counts. But the rule assumes you ran one test. Here there were twenty.' },
      { text: 'Treat it as a lead to test again, not a finding', why: `Right. With 20 independent tests at the 0.05 level, the chance of at least one false alarm is about ${pc(fw, 0)}, so one green metric is expected even if nothing changed. Run a follow-up test with "saved items" as the planned main metric.` },
      { text: 'Discard the whole test', why: 'Too harsh. The headline result is still valid. Only the one-of-twenty surprise needs care.' },
      { text: 'Lower the bar: call p below 0.10 a win', why: 'This makes false alarms even more likely, not less.' },
    ],
    best: 1,
    summary: 'The more things you check, the more likely one looks special by luck. Pick the main metric before the test starts.',
    working: [`P(at least one false alarm in 20 tests) = 1 - 0.95^20 = ${fw.toFixed(3)}`],
  },
  {
    id: 'stats-srm-split', topic: 'A/B test pitfalls', level: 3, title: 'The split is not 50/50', minutes: 6,
    scenario: `You planned a 50/50 test on 100,000 users. The logs show ${n(52000)} users in control and ${n(48000)} in the variant. The variant's conversion rate looks great. A teammate says "4,000 users is a small gap, the result is fine."`,
    question: 'What is the right call?',
    options: [
      { text: 'The result is fine: 52 and 48 are close enough', why: 'Tempting because the numbers look close. But with 100,000 users, random assignment almost never strays this far from half.' },
      { text: 'Do not trust the result yet. Find out why the split is off.', why: `Right. A split this far from 50/50 gives a chi-square of ${s.chi2.toFixed(0)}, a chance (p ${pv(s.p)}) under a fair split. Something like a bug, a bot filter, or a redirect broke the assignment, and that can fake a win.` },
      { text: 'Use the larger group only, since it has more data', why: 'This does not fix the cause. The missing users in the other group were probably not missing at random.' },
      { text: 'Re-weight the variant to match', why: 'Weighting hides the symptom. If the lost users differ from the rest, you would still compare different kinds of people.' },
    ],
    best: 1,
    summary: 'An uneven split (sample ratio mismatch) means the groups may not be comparable. Fix the cause before you read any result.',
    working: [`Expected 50,000 in each group`, `chi-square = (2,000^2 / 50,000) x 2 = ${s.chi2.toFixed(0)}`, `p ${pv(s.p)}`],
  },
  {
    id: 'stats-peeking', topic: 'A/B test pitfalls', level: 3, title: 'Stopping when it turns green', minutes: 6,
    scenario: `A 14-day test was planned. On day 5 (${n(10000)} users per group so far) control had 400 conversions and the variant 462, p = ${day5.p.toFixed(3)}. The team wants to stop and ship. If it runs the full 14 days (${n(28000)} per group), the totals are 1,120 and 1,198, p = ${day14.p.toFixed(3)}.`,
    question: 'What is the problem with stopping on day 5?',
    options: [
      { text: 'Nothing: p was below 0.05, so it is a win', why: 'Tempting, since the number crossed the line. But the line only works if you look once, at the planned end.' },
      { text: 'Checking every day and stopping at the first green gives many chances to be fooled', why: `Right. The p-value moves around as data arrives. Here it was ${day5.p.toFixed(3)} on day 5 and ${day14.p.toFixed(3)} at the planned end, which is not below 0.05. Stopping early would have shipped a result that did not hold.` },
      { text: 'Day 5 has too few users to compute a p-value', why: 'A p-value can be computed at any size. The problem is the habit of stopping when it looks good.' },
      { text: 'Weekends were missing', why: 'Weekly cycles are a real concern, but they are not the main issue in this scenario.' },
    ],
    best: 1,
    summary: 'Fix the stopping time in advance. If you must look early, use a method built for repeated looks.',
    working: [`Day 5: z = ${day5.z.toFixed(3)}, p = ${day5.p.toFixed(3)}`, `Day 14: z = ${day14.z.toFixed(3)}, p = ${day14.p.toFixed(3)}`],
  },
  {
    id: 'stats-novelty', topic: 'A/B test pitfalls', level: 3, title: 'A lift that fades', minutes: 6,
    scenario: `A redesigned banner. Week 1: control clicked ${pc(w1.p1)}, variant ${pc(w1.p2)} (${n(10000)} users per group, p ${pv(w1.p)}). Week 2, with a new set of users per group: control ${pc(w2.p1)}, variant ${pc(w2.p2)} (p = ${w2.p.toFixed(2)}). The PM wants to put the week 1 lift in the quarterly plan.`,
    question: 'What should you say?',
    options: [
      { text: 'Use week 1: it had the strongest result', why: 'Tempting because it is the biggest number. Picking the best week is a form of cherry-picking.' },
      { text: 'Average the two weeks and use that', why: 'This blends a short-lived effect into the long run. The average still overstates what you will see later.' },
      { text: 'The lift looks like a novelty effect. Plan on the week 2 level and keep watching.', why: `Right. Users click new things at first. The lift dropped from ${pts(w1.diff)} to ${pts(w2.diff)} points and the second week is no longer clearly different from chance (p = ${w2.p.toFixed(2)}). The later number is closer to the lasting effect.` },
      { text: 'Week 2 is noise, so ignore it', why: 'Week 2 had the same number of users as week 1. Ignoring it only because it is less exciting is the wrong way round.' },
    ],
    best: 2,
    summary: 'Look at the effect over time. If it shrinks as users get used to the change, plan with the settled level.',
    working: [`Week 1: ${pc(w1.p1)} vs ${pc(w1.p2)}, diff ${pts(w1.diff)} points, p ${pv(w1.p)}`, `Week 2: ${pc(w2.p1)} vs ${pc(w2.p2)}, diff ${pts(w2.diff)} points, p = ${w2.p.toFixed(3)}`],
  },
  {
    id: 'stats-small-lift', topic: 'Ship or not', level: 2, title: 'Significant, but is it big enough?', minutes: 5,
    scenario: `A checkout change on ${n(1000000)} users per group raised purchases from ${pc(t5.p1, 2)} to ${pc(t5.p2, 2)}, with p ${pv(t5.p)}. The interval for the lift is ${pts(t5.ci[0])} to ${pts(t5.ci[1])} points. The team agreed before the test that anything under 0.5 points is not worth the extra upkeep of the new flow.`,
    question: 'Ship or not?',
    options: [
      { text: 'Ship it: the result is highly significant', why: 'Tempting, because the p-value is tiny. But with a million users per group, even a trivial lift gets a tiny p-value. Significant does not mean big.' },
      { text: 'Do not ship on this result: the lift is real but below the bar', why: `Right. The whole interval (${pts(t5.ci[0])} to ${pts(t5.ci[1])} points) sits below the 0.5 point bar agreed up front. Record it and spend the upkeep elsewhere.` },
      { text: 'Rerun with more users to make it bigger', why: 'More users make the estimate sharper. They do not make the lift bigger.' },
      { text: 'Ship it to half the users', why: 'This only delays the same decision and keeps the upkeep cost.' },
    ],
    best: 1,
    summary: 'Compare the interval with the smallest lift worth having. Significance tells you it is real, size tells you if it matters.',
    working: [`Rates: ${pc(t5.p1, 2)} vs ${pc(t5.p2, 2)}, difference ${pts(t5.diff)} points`, `95% interval ${pts(t5.ci[0])} to ${pts(t5.ci[1])} points, p ${pv(t5.p)}`],
  },
  {
    id: 'stats-guardrail', topic: 'Ship or not', level: 3, title: 'The main metric wins, a guardrail slips', minutes: 7,
    scenario: `A redesigned signup page, ${n(50000)} users per group. Signups rose from ${pc(gp.p1)} to ${pc(gp.p2)} (p ${pv(gp.p)}). A guardrail metric, "cancelled within a week", rose from ${pc(gg.p1)} to ${pc(gg.p2)} (p ${pv(gg.p)}). The PM says "the goal metric won, ship."`,
    question: 'What do you recommend?',
    options: [
      { text: 'Ship: the goal metric is what we set out to move', why: 'Tempting because the plan named signups as the goal. But the guardrail exists to catch harm, and it moved the wrong way with a clear result.' },
      { text: 'Hold the launch and find out why people cancel more, then decide on net value', why: `Right. Cancels went from ${pc(gg.p1)} to ${pc(gg.p2)} while signups gained ${pts(gp.diff)} points. Some of the new signups may be low-quality ones. Check who cancels and how much the extra cancels cost before shipping.` },
      { text: 'Ignore the guardrail: it is a secondary metric', why: 'Guardrails are agreed in advance so that a win on the goal cannot hide a loss elsewhere.' },
      { text: 'Ship and fix cancels later', why: 'Tempting, since it keeps momentum. But it spreads a known problem to every user.' },
    ],
    best: 1,
    summary: 'A win on the goal metric does not count if a guardrail gets clearly worse. Understand the trade before shipping.',
    working: [`Signups: ${pc(gp.p1)} vs ${pc(gp.p2)}, z = ${gp.z.toFixed(2)}, p ${pv(gp.p)}`, `Cancels: ${pc(gg.p1)} vs ${pc(gg.p2)}, z = ${gg.z.toFixed(2)}, p ${pv(gg.p)}`],
  },
]
