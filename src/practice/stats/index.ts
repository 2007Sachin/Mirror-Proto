import { lazy } from 'react'
import type { TrackModule } from '../types'
import { items } from './items'

export const trackModule: TrackModule = {
  track: 'stats',
  title: 'Stats and A/B testing',
  blurb: 'Read real test numbers: averages, p-values, sample size, and when a result is not safe to ship.',
  topics: ['Descriptive stats', 'Hypothesis tests', 'Power and sample size', 'A/B test pitfalls', 'Ship or not'],
  items: items.map(i => ({ id: i.id, track: 'stats', topic: i.topic, level: i.level, title: i.title, minutes: i.minutes })),
  Drill: lazy(() => import('./Drill')),
}
