// The merged practice catalog. Each track folder exports `trackModule` from its index.ts.
import { trackModule as sql } from './sql'
import { trackModule as python } from './python'
import { trackModule as stats } from './stats/index'
import { trackModule as caseSim } from './case'
import type { PracticeItem, Track, TrackModule } from './types'

export const tracks: TrackModule[] = [sql, python, stats, caseSim]
export const catalog: PracticeItem[] = tracks.flatMap(t => t.items)

const byId = new Map(catalog.map(i => [i.id, i]))
export const findItem = (id: string): PracticeItem | undefined => byId.get(id)
export const moduleFor = (track: Track): TrackModule => tracks.find(t => t.track === track) ?? tracks[0]
