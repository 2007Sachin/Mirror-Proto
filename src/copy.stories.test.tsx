// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { scanHtml, walkData } from './copyScan'
import { THEMES } from './stories/themes'
import { suggestStories } from './stories/suggest'
import type { StoryRow } from './lib/data'

const sample: StoryRow = { id: '1', workspaceId: 'w', createdAt: '2026-01-01', updatedAt: '', title: 'Late migration', themes: ['deadline-pressure', 'leadership'], situation: 'Our team had a deadline.', task: '', action: 'I led it.', result: 'We finished early.', quote: 'I led it.', question: 'Tell me about a deadline?', sourceInterviewId: null, sourceTurnId: null }
vi.mock('./lib/data', () => ({ stories: { list: async () => [sample], create: async () => sample, update: async () => sample, remove: async () => undefined } }))
vi.mock('./lib/api', () => ({ api: { listInterviews: async () => [], getInterview: async () => ({}) } }))
import Stories from './pages/Stories'

describe('story bank copy', () => {
  it('theme list and suggestion reasons pass the scan', () => {
    expect(walkData('themes', THEMES.map(t => t.name))).toEqual([])
    const out = suggestStories('a tight deadline and leading', [sample])
    expect(walkData('reasons', out.map(o => o.reason))).toEqual([])
  })
  it('the page passes the scan', async () => {
    const { container, findByText } = render(<Stories />)
    await findByText('Late migration', { selector: 'h3' })
    expect(scanHtml('stories page', container.innerHTML)).toEqual([])
  })
})
