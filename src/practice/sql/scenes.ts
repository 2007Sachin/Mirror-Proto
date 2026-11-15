// Registry of animated "see it run" scenes, keyed by SqlModule.sceneId. Each scene is a self-contained, lazy component.
import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

export type SceneComponent = LazyExoticComponent<ComponentType<Record<string, never>>>

export const scenes: Record<string, SceneComponent> = {
  'exec-order': lazy(() => import('./visual/ExecOrder')),
  nulls: lazy(() => import('./visual/Nulls')),
  joins: lazy(() => import('./visual/Joins')),
  'group-by': lazy(() => import('./visual/GroupBy')),
  windows: lazy(() => import('./visual/Windows')),
  'c-index': lazy(() => import('./concepts/scenes/IndexScene')),
  'c-normal': lazy(() => import('./concepts/scenes/NormalScene')),
  'c-acid': lazy(() => import('./concepts/scenes/AcidScene')),
  'c-delete': lazy(() => import('./concepts/scenes/DeleteScene')),
}
