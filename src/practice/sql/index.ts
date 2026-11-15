import { lazy } from 'react'
import type { PracticeItem, TrackModule } from '../types'
import { problems } from './problems'
import { topics } from './topics'
import { conceptItems, conceptTopics } from './concepts/items'

export const trackModule: TrackModule = {
  track: 'sql',
  title: 'SQL',
  blurb: 'Write real queries against a small shop and signup database, from joins to funnels.',
  topics: [...topics, ...conceptTopics],
  items: [...problems.map((p): PracticeItem => ({ id: p.id, track: 'sql', topic: p.topic, level: p.level, title: p.title, minutes: p.minutes })), ...conceptItems],
  Drill: lazy(() => import('./Drill')),
}
