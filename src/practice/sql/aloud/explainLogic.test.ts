import { describe, expect, it } from 'vitest'
import { buildExplainSteps } from './explainLogic'
import { problems } from '../problems'

const ids = (s: ReturnType<typeof buildExplainSteps>) => s.map(x => x.id)

describe('buildExplainSteps', () => {
  it('names the real tables and join type', () => {
    const s = buildExplainSteps({ problem: {}, sql: 'SELECT * FROM orders o LEFT JOIN customers c ON c.id = o.cid' })
    expect(s[0].prompt).toBe('You joined orders and customers with a left join. Why that kind of join, and what would change if you swapped it?')
  })
  it('a bare JOIN is an inner join; several kinds are listed', () => {
    expect(buildExplainSteps({ problem: {}, sql: 'select 1 from a join b on 1=1' })[0].prompt).toContain('an inner join')
    expect(buildExplainSteps({ problem: {}, sql: 'select 1 from a join b on 1=1 left join c on 1=1' })[0].prompt).toContain('a, b and c with inner and left joins')
  })
  it('no join asks why not', () => {
    expect(buildExplainSteps({ problem: {}, sql: 'SELECT 1 FROM orders' })[0].prompt).toBe('You did not need a join here. Why not?')
  })
  it('NULL step from the SQL or from edgeCases', () => {
    expect(ids(buildExplainSteps({ problem: {}, sql: 'SELECT COALESCE(a,0) FROM t' }))).toContain('nulls')
    expect(ids(buildExplainSteps({ problem: { edgeCases: ['NULL salaries'] }, sql: 'SELECT 1 FROM t' }))).toContain('nulls')
    expect(ids(buildExplainSteps({ problem: {}, sql: 'SELECT 1 FROM t' }))).not.toContain('nulls')
  })
  it('ties step uses the edge case text, else the pattern default', () => {
    const e = buildExplainSteps({ problem: { edgeCases: ['Two people can tie for second'] }, sql: 'select 1 from t' }).find(x => x.id === 'ties')
    expect(e?.prompt).toContain('Two people can tie for second')
    const p = buildExplainSteps({ problem: { pattern: 'Top-N per group' }, sql: 'select 1 from t' }).find(x => x.id === 'ties')
    expect(p?.prompt).toBe('If two rows tie, which do you keep, and why?')
    expect(ids(buildExplainSteps({ problem: { pattern: 'Simple filter' }, sql: 'select 1 from t' }))).not.toContain('ties')
  })
  it('follow-up is last and skipped when absent', () => {
    const s = buildExplainSteps({ problem: { followUp: 'What if it were a billion rows?' }, sql: 'select 1 from t' })
    expect(s[s.length - 1]).toMatchObject({ id: 'followup', prompt: 'What if it were a billion rows?' })
    expect(ids(buildExplainSteps({ problem: {}, sql: 'select 1 from t' }))).not.toContain('followup')
  })
  it('works with CTE and window SQL and caps at four', () => {
    const sql = 'WITH r AS (SELECT *, RANK() OVER (PARTITION BY d ORDER BY s DESC) rk FROM emp e JOIN dept d ON d.id=e.d) SELECT * FROM r WHERE rk=2 AND s IS NOT NULL'
    const s = buildExplainSteps({ problem: { pattern: 'Nth per group', edgeCases: ['ties'], followUp: 'Next?' }, sql })
    expect(s).toHaveLength(4)
    expect(s[0].prompt).toContain('emp and dept')
  })
  it('falls back to a generic walk-through for blank SQL', () => {
    expect(buildExplainSteps({ problem: {}, sql: '  ' })).toEqual([{ id: 'walk', prompt: 'Walk me through your query from FROM to the last clause.' }])
  })
  it('never throws on the whole bank', () => {
    for (const p of problems) expect(buildExplainSteps({ problem: p, sql: p.solution }).length).toBeGreaterThan(0)
  })
})
