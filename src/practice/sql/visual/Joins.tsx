// Scene 'joins': two stacks of cards, threads to matches, rows flying into a result table, plus the fan-out trap.
import { useMemo, useState } from 'react'
import { AnimTable, Caption, SceneFrame, Seg, useStepper } from './shared'
import { CUSTS, fanOutSum, joinSteps, ORDERS, ORDERS_ONE, type Cust, type JoinKind, type Order, type Pair, type TRow } from './logic'

type Kind = JoinKind | 'self'
// viewBox is 320 wide so 13px text stays >= 12px on a 360px phone and grows on desktop
const CARD_H = 46, GAP = 12, CW = 132, RX = 188, VW = 320

export default function Joins() {
  const [kind, setKind] = useState<Kind>('left')
  const [many, setMany] = useState(true)
  const self = kind === 'self'
  const right: (Cust | Order)[] = self ? CUSTS : many ? ORDERS : ORDERS_ONE
  const steps = useMemo(
    () => joinSteps<Cust, Cust | Order>(self ? 'left' : (kind as JoinKind), CUSTS, right, self ? (c, r) => c.ref === (r as Cust).id : (c, r) => c.id === (r as Order).cust),
    [kind, self, right],
  )
  const st = useStepper(steps.length + 1)
  const cur = st.i > 0 ? steps[st.i - 1] : null
  const upto = steps.slice(0, st.i)
  const pairs: Pair[] = upto.flatMap(s => s.emit)
  const total = steps.flatMap(s => s.emit).length

  const rightLabel = (j: number) => (self ? (right[j] as Cust).name : `order ${(right[j] as Order).id}`)
  const cols = kind === 'anti' ? ['cust', 'name', 'credit'] : self ? ['cust', 'name', 'referred by'] : ['cust', 'name', 'credit', 'order', 'amt']
  const rows: TRow[] = pairs.map((p, n) => {
    const l = p.l === null ? null : CUSTS[p.l]
    const r = p.r === null ? null : right[p.r]
    const cells = kind === 'anti' ? [l!.id, l!.name, l!.credit]
      : self ? [l?.id ?? null, l?.name ?? null, r ? (r as Cust).name : null]
        : [l?.id ?? null, l?.name ?? null, l?.credit ?? null, r ? (r as Order).id : null, r ? (r as Order).amt : null]
    return { key: `${p.l}-${p.r}-${n}`, cells }
  })
  const fan = fanOutSum(pairs, l => CUSTS[l].credit)
  const showFan = !self && kind !== 'anti' && fan.joined > fan.actual

  let caption = 'Left cards are customers, right cards are orders. We will walk every customer once.'
  if (cur) {
    const name = cur.left === null ? '' : CUSTS[cur.left].name
    if (cur.left === null) caption = `${rightLabel(cur.matches[0])} has no customer, so ${kind === 'full' ? 'FULL' : 'RIGHT'} keeps it and fills the customer columns with NULL.`
    else if (cur.kind === 'match') caption = cur.matches.length > 1
      ? `${name} matches ${cur.matches.length} rows, so the ${self ? 'row' : 'customer'} is copied once per match.`
      : `${name} matches ${rightLabel(cur.matches[0])}, so one row flies to the result.`
    else if (cur.kind === 'pad') caption = `${name} has no match. LEFT keeps the row and pads the other side with NULL.`
    else if (cur.kind === 'keep') caption = `${name} has no match, and that is exactly what ANTI looks for, so ${name} is kept.`
    else caption = kind === 'anti' ? `${name} has a match, so ANTI leaves them out.` : `${name} has no match, so ${kind.toUpperCase()} drops this row.`
  }
  if (st.i === steps.length) caption += ` Done: ${total} result row${total === 1 ? '' : 's'}.`

  const H = Math.max(CUSTS.length, right.length) * (CARD_H + GAP)
  const y = (i: number) => i * (CARD_H + GAP) + 4
  const curve = (a: number, b: number) => `M${CW + 4},${y(a) + CARD_H / 2} C${CW + 26},${y(a) + CARD_H / 2} ${RX - 22},${y(b) + CARD_H / 2} ${RX - 2},${y(b) + CARD_H / 2}`
  const past = upto.slice(0, -1).flatMap(s => s.emit.filter(p => p.l !== null && p.r !== null))
  const hitRight = new Set(cur?.matches ?? [])
  const leftState = (i: number) => (cur?.left === i ? (cur.kind === 'match' ? 'scan' : 'pulse') : upto.some(s => s.left === i) ? 'done' : '')
  const rightState = (j: number) => (hitRight.has(j) ? (cur!.left === null ? 'pulse' : 'hit') : '')

  return (
    <SceneFrame title="How a join finds its rows" lead="Choose a join, then watch each customer look for matches." st={st}>
      <div className="vz-tools">
        <Seg label="Join" value={kind} onChange={v => { setKind(v); st.reset() }} options={[['inner', 'INNER'], ['left', 'LEFT'], ['right', 'RIGHT'], ['full', 'FULL'], ['anti', 'ANTI'], ['self', 'SELF']]} />
        {!self && <Seg label="Orders per customer" value={many ? 'many' : 'one'} onChange={v => { setMany(v === 'many'); st.reset() }} options={[['one', 'One each'], ['many', 'One to many']]} />}
      </div>
      <div className="vz-stage vz-join">
        <svg className="vz-svg" viewBox={`0 0 ${VW} ${H}`} role="img" aria-label={`Customers on the left, ${self ? 'the same customers' : 'orders'} on the right, with threads for matches`}>
          {past.map(p => <path key={`${p.l}-${p.r}`} d={curve(p.l!, p.r!)} pathLength={1} className="vz-thread past" />)}
          {cur?.left !== null && cur?.matches.map(j => <path key={`${st.i}-${j}`} d={curve(cur!.left!, j)} pathLength={1} className="vz-thread on" />)}
          {CUSTS.map((c, i) => (
            <g key={c.id} className={`vz-card ${leftState(i)}`} transform={`translate(4,${y(i)})`}>
              <rect width={CW} height={CARD_H} rx={10} />
              <text x={10} y={19} fontSize={13} fontWeight={700}>{c.id} {c.name}</text>
              <text x={10} y={36} fontSize={12} className="sub">{self ? `referred by ${c.ref ?? 'nobody'}` : `credit ${c.credit}`}</text>
            </g>
          ))}
          {right.map((r, j) => (
            <g key={`${self}-${r.id}`} className={`vz-card ${rightState(j)}`} transform={`translate(${RX},${y(j)})`}>
              <rect width={CW} height={CARD_H} rx={10} />
              <text x={10} y={19} fontSize={13} fontWeight={700}>{self ? `${r.id} ${(r as Cust).name}` : `order ${r.id}`}</text>
              <text x={10} y={36} fontSize={12} className="sub">{self ? `credit ${(r as Cust).credit}` : `customer ${(r as Order).cust}, amt ${(r as Order).amt}`}</text>
            </g>
          ))}
          {cur && cur.left !== null && cur.kind !== 'match' && (
            <g className="vz-badge" transform={`translate(${CW + 8},${y(cur.left) + CARD_H / 2 + 4})`}>
              <text fill="currentColor">{cur.kind === 'drop' ? 'drop' : cur.kind === 'keep' ? 'kept' : '+NULL'}</text>
            </g>
          )}
        </svg>
        <div style={{ display: 'grid', gap: 10 }}>
          <AnimTable cols={cols} rows={rows} maxRows={Math.max(total, 1)} />
          {showFan && <p className="vz-warn">Fan-out: SUM(credit) over these rows is {fan.joined}, but the customers really hold {fan.actual}. Repeated customers were counted more than once.</p>}
        </div>
      </div>
      <Caption>{caption}</Caption>
    </SceneFrame>
  )
}
