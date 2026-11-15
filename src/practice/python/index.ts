import { lazy } from 'react'
import type { TrackModule } from '../types'
import { problems } from './problems'

export const trackModule: TrackModule = {
  track: 'python',
  title: 'Python',
  blurb: 'Write small Python functions and check them against tests. Plain Python for now, without pandas.',
  topics: ['Strings and dicts', 'Lists and loops', 'Data cleaning', 'Algorithms'],
  items: problems.map(p => ({ id: p.id, track: 'python', topic: p.topic, level: p.level, title: p.title, minutes: p.minutes })),
  Drill: lazy(() => import('./Drill')),
}
