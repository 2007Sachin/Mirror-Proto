// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../../../components/LiveOrb', () => ({ LiveOrb: () => null }))
import JourneyMap from './JourneyMap'
import { sampleState } from './sampleState'

afterEach(cleanup)
const setup = () => {
  const open = vi.fn(), cont = vi.fn()
  render(<JourneyMap state={sampleState} onOpenNode={open} onContinue={cont} />)
  return { open, cont }
}

describe('JourneyMap', () => {
  it('continue and node start call back', () => {
    const { open, cont } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(cont).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /NULL and missing data, 2 of 4 solved, 1 star, recommended next/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue' }))
    expect(open).toHaveBeenCalledWith(sampleState.current)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4)
  })
  it('clicking a node button opens its sheet with a Start button', () => {
    const { open } = setup()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Join ideas, 0 of 5 solved, 0 stars/ }))
    const sheet = screen.getByRole('dialog', { name: 'Join ideas' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Start' }))
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 'c:joins' }))
  })
  it('closes the sheet with Escape', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /NULL and missing data/ }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
