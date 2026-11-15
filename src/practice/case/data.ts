import type { Database } from 'sql.js'
import type { Level } from '../types'

export interface Pick { id: string; text: string; why: string }
export interface Rec extends Pick { kind: 'best' | 'tempting' | 'harmful' }
export interface CaseDef {
  id: string; topic: string; level: Level; title: string; minutes: number
  from: string; brief: string
  tables: { name: string; columns: string[] }[]
  seed: () => string
  causes: Pick[]; cause: string // id of the real cause
  recs: Rec[]
  debrief: { cause: string; queries: { label: string; sql: string }[]; strong: string }
  /** A query that reveals the cause, and a check on its rows. Used by the test. */
  proof: { sql: string; ok: (rows: unknown[][]) => boolean }
}

// Small deterministic wobble so the data looks messy but never changes between runs.
const wob = (i: number, k: number, amp: number) => ((i * 7 + k * 13 + i * k) % 11 - 5) / 5 * amp
const ins = (table: string, rows: (string | number)[][]) => rows.map(r => `INSERT INTO ${table} VALUES (${r.map(v => (typeof v === 'string' ? `'${v}'` : v)).join(', ')});`).join('\n')
const date = (d: number) => new Date(Date.UTC(2025, 2, d)).toISOString().slice(0, 10) // day 1 = 2025-03-01

// ---- Case 1: signups dropped. Android build 4.2 (rolled out on day 8) barely converts. ----
function signupsSeed(): string {
  const base: Record<string, number> = { 'web-organic': 60, 'web-paid': 40, 'web-referral': 20, 'ios-organic': 50, 'ios-paid': 30, 'ios-referral': 15, 'android-organic': 50, 'android-paid': 30, 'android-referral': 15 }
  const rows: (string | number)[][] = []
  for (let d = 1; d <= 14; d++) {
    Object.entries(base).forEach(([key, b], k) => {
      const [device, channel] = key.split('-')
      const visits = (v: number) => Math.round(v * 10 * (1 + wob(d, k, 0.06)))
      const rate = (r: number) => r * (1 + wob(d + 3, k, 0.05))
      const add = (version: string, share: number, r: number) => {
        const v = visits(b * share)
        rows.push([date(d), channel, device, version, v, Math.round(v * rate(r))])
      }
      if (device === 'android') {
        if (d < 8) add('4.1', 1, 0.1)
        else { add('4.1', 0.55, 0.1); add('4.2', 0.45, 0.01) } // build 4.2 shipped on day 8
      } else add(device === 'ios' ? '5.0' : 'web', 1, 0.1)
    })
  }
  return `CREATE TABLE signups (day TEXT, channel TEXT, device TEXT, app_version TEXT, visits INTEGER, signups INTEGER);\n${ins('signups', rows)}`
}

// ---- Case 2: checkout conversion fell. Mobile web payments break on day 8; traffic is up (a decoy). ----
function funnelSeed(): string {
  const steps = ['view_product', 'add_to_cart', 'begin_checkout', 'add_payment', 'purchase']
  const rows: (string | number)[][] = []
  const dev = { desktop: [4000, .12, .62, .82, .86], mweb: [5000, .10, .55, .78, .85], app: [2000, .15, .65, .85, .88] } as const
  for (let d = 1; d <= 14; d++) {
    Object.entries(dev).forEach(([device, p], k) => {
      let u = Math.round(p[0] * (device === 'mweb' && d >= 8 ? 1.12 : 1) * (1 + wob(d, k, 0.05)))
      rows.push([date(d), device, steps[0], u])
      for (let s = 1; s < 5; s++) {
        let r = p[s] * (1 + wob(d + s, k, 0.03))
        if (device === 'mweb' && d >= 8 && s === 4) r = 0.38 * (1 + wob(d, s, 0.05)) // payment step regressed
        u = Math.round(u * r)
        rows.push([date(d), device, steps[s], u])
      }
    })
  }
  return `CREATE TABLE funnel_daily (day TEXT, device TEXT, step TEXT, users INTEGER);\n${ins('funnel_daily', rows)}`
}

// ---- Case 3: A/B test. Headline lift is positive, Android regresses and crashes. ----
function abSeed(): string {
  const rows: (string | number)[][] = [
    ['control', 'web', 20000, 800, 40], ['control', 'ios', 15000, 600, 30], ['control', 'android', 15000, 600, 45],
    ['treatment', 'web', 20000, 1000, 35], ['treatment', 'ios', 15000, 700, 28], ['treatment', 'android', 15000, 480, 900],
  ]
  return `CREATE TABLE ab_results (variant TEXT, platform TEXT, users INTEGER, purchases INTEGER, crashed_users INTEGER);\n${ins('ab_results', rows)}`
}

export const cases: CaseDef[] = [
  {
    id: 'case-signups-drop', topic: 'Metric drop', level: 2, title: 'Signups dropped this week', minutes: 15,
    from: 'Head of Growth',
    brief: 'Signups dropped 12% week over week. Marketing says it is seasonal and nothing to worry about. I need to know by end of day: what happened, and what do we do?',
    tables: [{ name: 'signups', columns: ['day (2025-03-01 to 2025-03-14)', 'channel (organic, paid, referral)', 'device (web, ios, android)', 'app_version', 'visits', 'signups'] }],
    seed: signupsSeed,
    causes: [
      { id: 'season', text: 'A seasonal dip, as marketing says', why: 'Tempting, but a seasonal dip would lower every device and channel a little. Here most segments are flat.' },
      { id: 'paid', text: 'The paid channel was paused or cut', why: 'A very common cause, but paid visits look the same in both weeks. Nothing was cut.' },
      { id: 'android', text: 'The new Android build (4.2) is not converting visitors into signups', why: 'Right. From 8 March, Android visitors on version 4.2 sign up at a tiny fraction of the usual rate, while 4.1 and every other device stay normal.' },
      { id: 'ios', text: 'iOS users are leaving for a competitor', why: 'Nothing in the iOS rows moved. Naming a competitor without data in hand is a story, not a finding.' },
    ],
    cause: 'android',
    recs: [
      { id: 'a', kind: 'best', text: 'Tell the stakeholder the Android 4.2 build is the cause. Ask engineering to check the signup screen and roll back or hotfix, then re-measure the rate for 4.2.', why: 'Right. It names the cause, the owner, the fix and how you will confirm it worked.' },
      { id: 'b', kind: 'tempting', text: 'Agree it is seasonal, and review again next week.', why: 'Tempting because it is the easy story and nobody has to act. But the data points to one broken segment, and every day of waiting loses signups.' },
      { id: 'c', kind: 'harmful', text: 'Raise paid marketing spend across all devices to win signups back.', why: 'Harmful. It sends more visitors into the broken Android flow and burns budget without fixing the cause.' },
    ],
    debrief: {
      cause: 'Android build 4.2 rolled out on 8 March. Visitors on that build sign up at about one tenth of the normal rate. All other segments are flat.',
      queries: [
        { label: 'Weekly total, to confirm the drop', sql: "SELECT CASE WHEN day < '2025-03-08' THEN 'week 1' ELSE 'week 2' END AS week, SUM(signups) AS signups FROM signups GROUP BY 1" },
        { label: 'Signup rate by device and version, this week', sql: "SELECT device, app_version, SUM(visits) AS visits, SUM(signups) AS signups, ROUND(SUM(signups) * 1.0 / SUM(visits), 3) AS rate FROM signups WHERE day >= '2025-03-08' GROUP BY 1, 2 ORDER BY rate" },
      ],
      strong: 'A strong answer confirms the size of the drop, splits it by channel, device and version, finds the one segment whose rate collapsed, names the likely cause (build 4.2), says what you are not sure of (why the build fails), proposes a fix and says how you will check it worked.',
    },
    proof: {
      sql: "SELECT device, app_version, SUM(signups) * 1.0 / SUM(visits) AS rate FROM signups WHERE day >= '2025-03-08' GROUP BY 1, 2 ORDER BY rate LIMIT 2",
      ok: rows => rows[0][0] === 'android' && rows[0][1] === '4.2' && (rows[0][2] as number) < 0.02 && (rows[1][2] as number) > 0.07,
    },
  },
  {
    id: 'case-checkout-funnel', topic: 'Funnel analysis', level: 3, title: 'Checkout conversion fell', minutes: 18,
    from: 'Head of Product',
    brief: 'Fewer people are buying since last week, even though traffic is up. The team thinks visitors are just browsing more. Where in the checkout are we losing people?',
    tables: [{ name: 'funnel_daily', columns: ['day (2025-03-01 to 2025-03-14)', 'device (desktop, mweb, app)', "step ('view_product', 'add_to_cart', 'begin_checkout', 'add_payment', 'purchase')", 'users (distinct users who reached the step that day)'] }],
    seed: funnelSeed,
    causes: [
      { id: 'browse', text: 'More casual browsers, so the rate looks lower', why: 'Tempting and partly true that traffic is up, but the early steps (view to cart to checkout) convert as before. Browsers do not explain a drop at the last step.' },
      { id: 'cart', text: 'Add-to-cart is broken on all devices', why: 'The add-to-cart rate is steady in both weeks on every device.' },
      { id: 'pay', text: 'The payment step on mobile web stopped completing', why: 'Right. On mobile web, users who add payment details now complete the purchase far less often. Desktop and the app are normal.' },
      { id: 'price', text: 'A price increase scared people off', why: 'A price rise would hit the early steps and all devices, not one step on one device. There is also no price data here to say so.' },
    ],
    cause: 'pay',
    recs: [
      { id: 'a', kind: 'best', text: 'Tell them the add-payment to purchase step on mobile web regressed from the 8th. Ask engineering to check the payment form and recent releases for mobile web, and track that step daily.', why: 'Right. It points at one step on one device and a clear next action.' },
      { id: 'b', kind: 'tempting', text: 'Run a discount campaign to lift overall conversion.', why: 'Tempting because it feels like action. But it costs margin and leaves a broken payment step in place.' },
      { id: 'c', kind: 'harmful', text: 'Redesign the whole checkout flow next quarter.', why: 'Harmful. It spends months on a flow that is only broken at one step, and meanwhile mobile web keeps losing orders.' },
    ],
    debrief: {
      cause: 'From 8 March the step from add_payment to purchase on mobile web completes far less often. Other steps and devices did not move.',
      queries: [
        { label: 'Step counts by device, this week', sql: "SELECT device, step, SUM(users) AS users FROM funnel_daily WHERE day >= '2025-03-08' GROUP BY 1, 2 ORDER BY device, users DESC" },
        { label: 'Payment to purchase rate, by device and week', sql: "SELECT device, CASE WHEN day < '2025-03-08' THEN 'week 1' ELSE 'week 2' END AS week, ROUND(SUM(CASE WHEN step = 'purchase' THEN users END) * 1.0 / SUM(CASE WHEN step = 'add_payment' THEN users END), 2) AS pay_to_buy FROM funnel_daily GROUP BY 1, 2" },
      ],
      strong: 'A strong answer builds the funnel by device, compares step-to-step rates across weeks, shows that only one step on one device changed, rules out the browsing story, and asks for a technical check of that step.',
    },
    proof: {
      sql: "SELECT device, SUM(CASE WHEN step = 'purchase' THEN users END) * 1.0 / SUM(CASE WHEN step = 'add_payment' THEN users END) AS r FROM funnel_daily WHERE day >= '2025-03-08' GROUP BY 1 ORDER BY r LIMIT 2",
      ok: rows => rows[0][0] === 'mweb' && (rows[0][1] as number) < 0.45 && (rows[1][1] as number) > 0.78,
    },
  },
  {
    id: 'case-ab-android', topic: 'A/B decision', level: 3, title: 'The test won, but should we ship?', minutes: 15,
    from: 'Product Manager',
    brief: 'The new purchase flow beat control overall. I would like to ship it to everyone this afternoon. Anything I should know first?',
    tables: [{ name: 'ab_results', columns: ['variant (control, treatment)', 'platform (web, ios, android)', 'users', 'purchases', 'crashed_users'] }],
    seed: abSeed,
    causes: [
      { id: 'fine', text: 'It is a clean win everywhere', why: 'Tempting because the headline is positive. The split by platform tells a different story.' },
      { id: 'android', text: 'Android is worse and crashes more under the new flow, hidden by gains on web', why: 'Right. Web and iOS improved, but Android purchases fell and crashed users jumped about twenty times over.' },
      { id: 'noise', text: 'The overall lift is just noise', why: 'The overall lift is clear with this many users. The issue is where it came from, not whether it is random.' },
      { id: 'ios', text: 'iOS is the weak segment', why: 'iOS improved a little. Check the table before blaming a segment.' },
    ],
    cause: 'android',
    recs: [
      { id: 'a', kind: 'best', text: 'Do not ship to Android yet. Ship to web and iOS if the team agrees, and ask engineering to fix the Android crash first, then retest.', why: 'Right. It keeps the real gains, protects Android users and names the next step.' },
      { id: 'b', kind: 'tempting', text: 'Ship to everyone: the overall result is positive.', why: 'Tempting because the headline is a win. But a good total can hide a segment that is clearly worse, and here that segment also crashes.' },
      { id: 'c', kind: 'harmful', text: 'Throw the test out and keep the old flow everywhere.', why: 'Harmful. It throws away real gains on web and iOS because of one fixable problem.' },
    ],
    debrief: {
      cause: 'On Android the new flow lowers purchases and about 900 users crashed, compared with about 45 in control. Web and iOS gained, which lifts the total.',
      queries: [
        { label: 'Headline by variant', sql: 'SELECT variant, SUM(users) AS users, SUM(purchases) AS purchases, ROUND(SUM(purchases) * 1.0 / SUM(users), 4) AS rate FROM ab_results GROUP BY 1' },
        { label: 'By platform', sql: 'SELECT platform, variant, users, purchases, ROUND(purchases * 1.0 / users, 4) AS rate, crashed_users FROM ab_results ORDER BY platform, variant' },
      ],
      strong: 'A strong answer reports the headline, then splits by platform before agreeing to ship, spots that Android is worse and crashing, recommends a split rollout and a fix, and says how you would retest.',
    },
    proof: {
      sql: "SELECT platform, MAX(CASE WHEN variant = 'treatment' THEN purchases * 1.0 / users END) - MAX(CASE WHEN variant = 'control' THEN purchases * 1.0 / users END) AS lift FROM ab_results GROUP BY 1 ORDER BY lift LIMIT 1",
      ok: rows => rows[0][0] === 'android' && (rows[0][1] as number) < -0.005,
    },
  },
]

export async function createCaseDb(id: string, locate?: () => string): Promise<Database> {
  const c = cases.find(x => x.id === id)
  if (!c) throw new Error('Unknown case')
  const { loadSql } = await import('../../pages/target/sqlEngine') // lazy: keeps sql.js out of the catalog bundle
  const SQL = await loadSql(locate)
  const db = new SQL.Database()
  db.run(c.seed())
  return db
}
