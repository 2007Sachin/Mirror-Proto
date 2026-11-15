// Scene 'group-by': chips slide into buckets, counters tick, buckets collapse to rows. WHERE vs HAVING timing, COUNT vs DISTINCT.
import { useMemo, useState } from 'react'
import { AnimTable, Caption, SceneFrame, Seg, useStepper } from './shared'
import { groupBuckets, G_ROWS, type GRow, type TRow } from './logic'

type Mode = 'none' | 'where' | 'having'
type Metric = 'count' | 'distinct'
const REGIONS = ['N', 'S', 'E']
const TINT = [14, 30, 46]
const where = (r: GRow) => r.amt > 20

export default function GroupBy() {
  const [mode, setMode] = useState<Mode>('none')
  const [metric, setMetric] = useState<Metric>('count')
  const buckets = useMemo(() => groupBuckets(G_ROWS, { where: mode === 'where' ? where : undefined, having: mode === 'having' ? b => b.sum > 100 : undefined }), [mode])
  const sliding = G_ROWS.filter(r => mode !== 'where' || where(r))
  // phases: 0 intro, [where], one per sliding chip, collapse, [having]
  const hasWhere = mode === 'where', hasHaving = mode === 'having'
  const st = useStepper(1 + (hasWhere ? 1 : 0) + sliding.length + 1 + (hasHaving ? 1 : 0))
  const whereAt = hasWhere ? 1 : 0
  const slid = Math.max(0, Math.min(sliding.length, st.i - whereAt))
  const collapseAt = 1 + whereAt + sliding.length
  const collapsed = st.i >= collapseAt
  const havingNow = hasHaving && st.i === collapseAt + 1
  const whereShown = hasWhere && st.i >= 1
  const slidIds = new Set(sliding.slice(0, slid).map(r => r.id))
  const stack: Record<string, number> = {}
  const pos = new Map<number, { left: string; top: number }>()
  G_ROWS.forEach((r, idx) => {
    const k = REGIONS.indexOf(r.region)
    if (slidIds.has(r.id)) { const n = stack[r.region] ?? 0; stack[r.region] = n + 1; pos.set(r.id, { left: `calc(112px + ${k} * ((100% - 112px) / 3) + 6px)`, top: 56 + n * 32 }) }
    else pos.set(r.id, { left: `${(idx % 2) * 50 + 6}px`, top: 12 + Math.floor(idx / 2) * 34 })
  })
  const live = (key: string) => groupBuckets(sliding.filter(r => slidIds.has(r.id)), {}).find(b => b.key === key)
  const label = metric === 'count' ? 'COUNT(*)' : 'COUNT(DISTINCT cust)'
  const val = (b: { count: number; distinct: number } | undefined) => (b ? (metric === 'count' ? b.count : b.distinct) : 0)
  const rows: TRow[] = collapsed ? buckets.map(b => ({ key: b.key, cells: [b.key, val(b), b.sum], tint: REGIONS.indexOf(b.key) + 1, tone: havingNow && !b.keep ? 'ghost' : undefined })) : []
  const final = hasHaving && st.i > collapseAt

  let caption = 'Each chip is one order. The letter is its region, the number its amount.'
  if (hasWhere && st.i === 1) caption = 'WHERE acts first, on single rows: orders of 20 or less fade away before any bucket exists.'
  else if (st.i > whereAt && st.i < collapseAt) { const r = sliding[slid - 1]; caption = `Order ${r.id} (${r.cust}) slides into bucket ${r.region}, so its counter and total tick up.` }
  else if (st.i === collapseAt) caption = `Each bucket folds into one row. ${metric === 'distinct' ? 'COUNT(DISTINCT cust) counts each customer once, even with several orders.' : 'COUNT(*) counts every row in the bucket.'}`
  else if (havingNow) caption = 'HAVING acts last, on whole buckets: a total of 100 or less is dropped. Rows were already counted.'
  if (final) caption += ' Rows that were removed are gone from the result.'

  return (
    <SceneFrame title="Rows fall into buckets" lead="GROUP BY turns many rows into one row per key." st={st}>
      <div className="vz-tools">
        <Seg label="Filter" value={mode} onChange={v => { setMode(v); st.reset() }} options={[['none', 'None'], ['where', 'WHERE amt > 20'], ['having', 'HAVING SUM > 100']]} />
        <Seg label="Count" value={metric} onChange={setMetric} options={[['count', 'COUNT(*)'], ['distinct', 'COUNT(DISTINCT cust)']]} />
      </div>
      <div className="vz-field" role="img" aria-label="Order chips sliding into one bucket per region">
        {REGIONS.map((k, n) => {
          const b = live(k)
          return (
            <div key={k} className={`vz-bk ${collapsed ? 'dim' : ''}`} style={{ left: `calc(112px + ${n} * ((100% - 112px) / 3))`, width: 'calc((100% - 112px) / 3 - 6px)', '--t': `${TINT[n]}%` } as React.CSSProperties}>
              <b>{k}</b> <span key={val(b)} className="vz-tick">{val(b)}</span><br />
              <span key={b?.sum ?? 0} className="vz-tick">{b?.sum ?? 0}</span>
            </div>
          )
        })}
        {G_ROWS.map(r => {
          const removed = whereShown && !where(r)
          const p = pos.get(r.id)!
          return <div key={r.id} className={`vz-pip ${removed ? 'ghost' : ''} ${collapsed && !removed ? 'gone' : ''}`} style={{ left: p.left, top: p.top, '--t': `${TINT[REGIONS.indexOf(r.region)]}%` } as React.CSSProperties}>{r.region} {r.amt}</div>
        })}
      </div>
      <AnimTable cols={['region', label, 'SUM(amt)']} rows={final ? rows.filter(x => x.tone !== 'ghost') : rows} maxRows={3} />
      <Caption>{caption}</Caption>
    </SceneFrame>
  )
}
