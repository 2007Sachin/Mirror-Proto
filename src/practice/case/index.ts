import { lazy } from 'react'
import type { TrackModule } from '../types'
import { cases } from './data'

export const trackModule: TrackModule = {
  track: 'case',
  title: 'Case simulator',
  blurb: 'Work a short, messy brief like a real day: dig into the data, find what happened, and advise the team.',
  topics: ['Metric drop', 'Funnel analysis', 'A/B decision'],
  items: cases.map(c => ({ id: c.id, track: 'case', topic: c.topic, level: c.level, title: c.title, minutes: c.minutes })),
  Drill: lazy(() => import('./Drill')),
}
