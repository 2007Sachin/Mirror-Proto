// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { scanHtml } from './copyScan'
import { MatchView } from './features/match/MatchSection'
import { sampleMatch } from './features/match/sampleMatch'

const noop = async () => 'saved' as const

describe('copy: résumé vs this job', () => {
  it('has no banned words, counts or percentages', () => {
    const empty = { ...sampleMatch, hasResume: false, matches: [], claims: [], probes: [] }
    const html = [
      renderToStaticMarkup(<MatchView data={{ ...sampleMatch, aiAttempted: true }} onSave={noop} onPractiseProbe={() => {}} />),
      renderToStaticMarkup(<MatchView data={empty} onSave={noop} />),
      renderToStaticMarkup(<MatchView data={{ ...sampleMatch, matches: [], claims: [] }} onSave={noop} />),
    ]
    expect(html.flatMap((h, i) => scanHtml(`match[${i}]`, h))).toEqual([])
    expect(html[0]).toContain('Mentioned, but no result')
  })
})
