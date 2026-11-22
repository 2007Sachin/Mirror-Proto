// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { WEAK_KEY, clearWeak, isWeak, loadWeakSpots, markWeak, parseWeakSpots, saveWeakSpots, toggleWeak, unmarkWeak, weakCount, weakForRole } from './weakSpots'

const a = { role: 'product-manager', round: 1, question: 3 }
const b = { role: 'product-manager', round: 0, question: 7 }
const c = { role: 'data-analytics', round: 1, question: 3 }

describe('weak-spot memory', () => {
  beforeEach(() => localStorage.clear())

  it('marks once, even when marked twice', () => {
    expect(markWeak(markWeak([], a), a)).toEqual([a])
  })
  it('does not mutate the list it is given', () => {
    const list = Object.freeze([a]) as typeof a[]
    markWeak(list, b); unmarkWeak(list, a)
    expect(list).toEqual([a])
  })
  it('rejects malformed spots', () => {
    expect(markWeak([], { role: '', round: 0, question: 0 })).toEqual([])
    expect(markWeak([], { role: 'x', round: -1, question: 0 })).toEqual([])
    expect(markWeak([], { role: 'x', round: 0.5, question: 0 })).toEqual([])
  })
  it('toggles on and off', () => {
    const on = toggleWeak([], a)
    expect(isWeak(on, a)).toBe(true)
    expect(toggleWeak(on, a)).toEqual([])
  })
  it('lists per role in round then question order and counts per round', () => {
    const list = [a, c, b]
    expect(weakForRole(list, 'product-manager')).toEqual([b, a])
    expect(weakForRole(list, 'finance')).toEqual([])
    expect(weakCount(list, 'product-manager', 1)).toBe(1)
    expect(weakCount(list, 'data-analytics', 0)).toBe(0)
  })
  it('clears one role or everything', () => {
    expect(clearWeak([a, b, c], 'product-manager')).toEqual([c])
    expect(clearWeak([a, b, c])).toEqual([])
  })
  it('round-trips through localStorage under the one key', () => {
    saveWeakSpots([a, c])
    expect(Object.keys(localStorage)).toEqual([WEAK_KEY])
    expect(loadWeakSpots()).toEqual([a, c])
  })
  it('removes the key when the list is emptied', () => {
    saveWeakSpots([a]); saveWeakSpots([])
    expect(localStorage.getItem(WEAK_KEY)).toBeNull()
  })
  it('starts fresh on unreadable or malformed storage', () => {
    for (const raw of [null, '', '{nope', 'null', '{"items":5}', '[]']) expect(parseWeakSpots(raw), String(raw)).toEqual([])
    expect(parseWeakSpots(JSON.stringify({ items: [a, a, { role: 1 }, null, 'x', { ...c, extra: 'y' }] }))).toEqual([a, c])
  })
  it('survives storage that throws', () => {
    const boom = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('full') }, removeItem: () => { throw new Error('denied') } }
    expect(loadWeakSpots(boom)).toEqual([])
    expect(() => saveWeakSpots([a], boom)).not.toThrow()
  })
  it('makes no network calls', () => {
    const real = globalThis.fetch
    let calls = 0
    globalThis.fetch = (() => { calls++; return Promise.reject(new Error('no')) }) as typeof fetch
    try { saveWeakSpots(markWeak([], a)); loadWeakSpots() } finally { globalThis.fetch = real }
    expect(calls).toBe(0)
  })
})
