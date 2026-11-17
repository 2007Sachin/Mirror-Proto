// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { scanHtml } from '../../copyScan'
import FollowedTap from './FollowedTap'

afterEach(() => vi.unstubAllGlobals())

describe('FollowedTap', () => {
  it('asks once, posts the answer, then thanks', () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<FollowedTap interviewId="i1" />)
    expect(scanHtml('followed tap', container.innerHTML)).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Not really' }))
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ interviewId: 'i1', followed: false })
    expect(screen.getByRole('status').textContent).toContain('Thank you')
    expect(screen.queryByRole('button')).toBeNull()
    expect(scanHtml('followed tap thanks', container.innerHTML)).toEqual([])
  })
})
