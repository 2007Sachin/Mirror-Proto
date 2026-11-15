// Pure helpers for Concept check: ids, answer check, per-topic progress and queues. No React, no data imports.
export interface ItemLike { id: string; topic: string; level: 1 | 2 | 3 }

export const isConceptId = (id: string) => id.startsWith('sql-c-')
export const checkAnswer = (answer: number, picked: number | null) => picked !== null && picked === answer

export function topicProgress(items: ItemLike[], topic: string, solved: Set<string>) {
  const mine = items.filter(i => i.topic === topic)
  return { done: mine.filter(i => solved.has(i.id)).length, total: mine.length }
}

const byLevel = <T extends ItemLike>(a: T, b: T) => a.level - b.level

/** One topic: unsolved first, each group easy to hard. Falls back to all when everything is solved (practise again). */
export function topicQueue<T extends ItemLike>(items: T[], topic: string, solved: Set<string>): T[] {
  const mine = items.filter(i => i.topic === topic)
  const todo = mine.filter(i => !solved.has(i.id)).sort(byLevel)
  return todo.length ? todo : [...mine].sort(byLevel)
}

/** A mixed set: round-robin across topics (unsolved first, easy first inside each topic), so the same state gives the same set. */
export function mixedQueue<T extends ItemLike>(items: T[], topics: readonly string[], solved: Set<string>, count = 10): T[] {
  // ponytail: round-robin, not random; same input = same set. Add a seeded shuffle if it feels samey.
  const lists = topics.map(t => [...items.filter(i => i.topic === t)].sort((a, b) => Number(solved.has(a.id)) - Number(solved.has(b.id)) || byLevel(a, b)))
  const out: T[] = []
  for (let r = 0; out.length < count && lists.some(l => r < l.length); r++)
    for (const l of lists) if (r < l.length && out.length < count) out.push(l[r])
  return out
}
