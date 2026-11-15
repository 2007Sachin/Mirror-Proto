// Scene 'windows': a sliding frame band computes a new column while every row stays. Compare with GROUP BY.
import { useState } from 'react'
import { AnimTable, Caption, HEAD_H, ROW_H, SceneFrame, Seg, useStepper } from './shared'
import { groupAvg, windowCompute, type TRow, type WinFn } from './logic'

const FNS: [WinFn, string][] = [['row_number', 'ROW_NUMBER'], ['rank', 'RANK'], ['dense_rank', 'DENSE_RANK'], ['lag', 'LAG'], ['sum', 'Running SUM'], ['avg', 'Moving AVG']]
const fmt = (v: number | null) => (v === null ? null : +v.toFixed(2))

export default function Windows() {
  const [fn, setFn] = useState<WinFn>('rank')
  const [part, setPart] = useState(true)
  const [pre, setPre] = useState(2)
  const [mode, setMode] = useState<'window' | 'group'>('window')
  const { rows, values, frames } = windowCompute(fn, part, pre)
  const n = rows.length
  const st = useStepper(mode === 'window' ? n + 1 : 1)
  const k = mode === 'window' ? st.i : 0
  const deptTint = (d: string) => (part ? (d === 'Eng' ? 1 : 2) : 0)
  const colName = fn === 'avg' ? `AVG over ${pre + 1}` : FNS.find(f => f[0] === fn)![1].toLowerCase()
  const trows: TRow[] = mode === 'window'
    ? rows.map((r, i) => ({ key: r.emp, cells: [r.dept, r.emp, r.sal, i < k ? fmt(values[i]) : '...'], tint: deptTint(r.dept), tone: i === k - 1 ? 'hl' : undefined }))
    : groupAvg().map(g => ({ key: g.dept, cells: [g.dept, `${g.n} people`, '-', +g.avg.toFixed(2)], tint: deptTint(g.dept) }))
  const cols = mode === 'window' ? ['dept', 'emp', 'sal', colName] : ['dept', 'rows', '', 'AVG(sal)']
  const band = k > 0 && mode === 'window' ? frames[k - 1] : null
  const ties = (i: number) => rows.some((r, j) => j !== i && r.sal === rows[i].sal && (!part || r.dept === rows[i].dept))

  let caption = 'Same table, but this time no row will disappear. A frame band will walk down it.'
  if (mode === 'group') caption = 'GROUP BY collapses 8 people into 2 rows. A window function would keep all 8, so you can compare each person with their group.'
  else if (k > 0) {
    const r = rows[k - 1], v = values[k - 1], size = frames[k - 1][1] - frames[k - 1][0] + 1
    if (fn === 'row_number') caption = `${r.emp} is simply number ${v}${part ? ` in ${r.dept}` : ''}. Ties still get different numbers.`
    else if (fn === 'rank') caption = ties(k - 1) ? `${r.emp} ties with someone on ${r.sal}, so they share rank ${v} and the next rank skips a number.` : `${r.emp} has rank ${v}: ${v === 1 ? 'nobody earns more' : 'that many people are at or above'}.`
    else if (fn === 'dense_rank') caption = ties(k - 1) ? `${r.emp} ties on ${r.sal}, shares rank ${v}, and no number is skipped afterwards.` : `${r.emp} has dense rank ${v}: ranks never skip.`
    else if (fn === 'lag') caption = v === null ? `${r.emp} is first${part ? ' in the team' : ''}, so there is no earlier row: the answer is NULL.` : `${r.emp} looks one row back and sees ${v}.`
    else if (fn === 'sum') caption = `The frame runs from the first row${part ? ' of the team' : ''} to ${r.emp}, so the running total is ${v}.`
    else caption = `The frame holds ${size} row${size === 1 ? '' : 's'} ending at ${r.emp}; their average is ${v}.`
    if (k === n) caption += ' All 8 rows are still here.'
  }

  return (
    <SceneFrame title="A window slides, rows stay" lead="Window functions calculate over a frame of nearby rows without collapsing them." st={st}>
      <div className="vz-tools">
        <Seg label="Function" value={fn} onChange={v => { setFn(v); st.reset() }} options={FNS} />
        <Seg label="PARTITION BY dept" value={part ? 'on' : 'off'} onChange={v => { setPart(v === 'on'); st.reset() }} options={[['on', 'On'], ['off', 'Off']]} />
        <Seg label="Output" value={mode} onChange={v => { setMode(v); st.reset() }} options={[['window', 'Window (keeps rows)'], ['group', 'GROUP BY (collapses)']]} />
        {fn === 'avg' && mode === 'window' && (
          <label className="vz-scrub">
            <span>ROWS BETWEEN {pre} PRECEDING AND CURRENT ROW</span>
            <input type="range" min={0} max={3} value={pre} onChange={e => { setPre(Number(e.target.value)); st.reset() }} aria-label="Rows preceding in the frame" />
          </label>
        )}
      </div>
      <AnimTable cols={cols} rows={trows} maxRows={n} hlCol={mode === 'window' ? 3 : undefined}>
        {band && <div className="vz-band" aria-hidden="true" style={{ top: HEAD_H + band[0] * ROW_H, height: (band[1] - band[0] + 1) * ROW_H }} />}
      </AnimTable>
      <Caption>{caption}</Caption>
    </SceneFrame>
  )
}
