// Lazy entry points: sql.js only loads when one of these renders.
import { lazy } from 'react'

export const QueryExplainer = lazy(() => import('./QueryExplainer'))
export const TablePeek = lazy(() => import('./TablePeek'))
export type { Stage } from './stages'
