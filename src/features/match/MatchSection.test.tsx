// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MatchView } from './MatchSection'
import { topProbes } from './topProbes'
import { sampleMatch } from './sampleMatch'

afterEach(cleanup)

describe('MatchView', () => {
  it('lists core first with plain statuses, the learner quote, notes and the probe', () => {
    render(<MatchView data={sampleMatch} onSave={async () => 'saved'} onPractiseProbe={() => {}} />)
    expect(screen.getByText('Covered')).toBeTruthy()
    expect(screen.getAllByText('Mentioned, but no result').length).toBe(2)
    expect(screen.getByText('Not on your résumé')).toBeTruthy()
    expect(screen.getAllByText(/Worked on Python scripts/).length).toBeGreaterThan(0)
    expect(screen.getByText(/This line is vague/)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Prepare this question' }).length).toBe(3)
  })

  it('shows no practise button without the prop, and the fallback note only when the assistant was tried', () => {
    const { rerender } = render(<MatchView data={sampleMatch} onSave={async () => 'saved'} />)
    expect(screen.queryByRole('button', { name: 'Prepare this question' })).toBeNull()
    expect(screen.queryByText(/Written from your own words/)).toBeNull()
    rerender(<MatchView data={{ ...sampleMatch, aiAttempted: true }} onSave={async () => 'saved'} />)
    expect(screen.getByText(/Written from your own words/)).toBeTruthy()
  })

  it('passes the question to onPractiseProbe', () => {
    const onPractiseProbe = vi.fn()
    render(<MatchView data={sampleMatch} onSave={async () => 'saved'} onPractiseProbe={onPractiseProbe} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Prepare this question' })[0])
    expect(onPractiseProbe).toHaveBeenCalledWith(sampleMatch.matches.find(m => m.probeQuestion)!.probeQuestion)
  })

  it('has an honest empty state with a paste box that saves', async () => {
    const onSave = vi.fn(async () => 'saved' as const)
    render(<MatchView data={{ ...sampleMatch, hasResume: false, matches: [], claims: [], probes: [] }} onSave={onSave} />)
    expect(screen.getByText(/no résumé on file/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Paste your résumé'), { target: { value: 'Built a thing in SQL.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save and compare' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Built a thing in SQL.'))
  })

  it('says so when there is no profile to hold the résumé', async () => {
    render(<MatchView data={{ ...sampleMatch, hasResume: false, matches: [], claims: [], probes: [] }} onSave={async () => 'no-profile'} />)
    fireEvent.change(screen.getByLabelText('Paste your résumé'), { target: { value: 'Built a thing.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save and compare' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
  })
})

describe('topProbes', () => {
  it('ranks core gaps, then core partials, then nice partials, and skips covered rows', () => {
    const out = topProbes(sampleMatch.matches, 5)
    expect(out.map(p => p.skill)).toEqual(['Docker', 'SQL', 'Python'])
    expect(topProbes(sampleMatch.matches, 1)).toHaveLength(1)
    expect(topProbes([], 3)).toEqual([])
  })
})
