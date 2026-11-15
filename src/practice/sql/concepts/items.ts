import type { PracticeItem } from '../../types'
import { concepts } from './data'

export { conceptTopics } from './types'
export { isConceptId } from './logic'
export const conceptItems: PracticeItem[] = concepts.map(c => ({ id: c.id, track: 'sql', topic: c.topic, level: c.level, title: c.title, minutes: c.minutes }))
