/* eslint-disable react-refresh/only-export-components */
import { lazy, type AnchorHTMLAttributes, type ComponentType, type LazyExoticComponent, type MouseEvent } from 'react'
import type { SitePageProps } from './types'

export type SiteRouteId =
  | 'home' | 'product' | 'solution' | 'pricing' | 'journeys' | 'journey' | 'add-your-work' | 'add-your-work-detail'
  | 'notes' | 'note' | 'why-mirror' | 'about' | 'careers' | 'legal' | 'get-started' | 'glossary' | 'resources'
  | 'kind-words' | 'login' | 'signup'

export type SitePage = LazyExoticComponent<ComponentType<SitePageProps>>

export interface SiteRoute {
  id: SiteRouteId
  /** Pattern: literal segments, `:name` params, and a trailing `?` for an optional last segment. */
  path: string
  /** Lazy page, so the app bundle stays small. `null` for login/signup: the app's own sign-in flow handles those. */
  Component: SitePage | null
}

/** Flip to true when pages/Home.tsx is the real home page. Until then `/` keeps showing src/pages/Landing.tsx. */
export const SITE_HOME_LIVE = true

/** Every marketing route. Existing app routes (/workspace /targets /practice /reports /stories /prep /profile /settings
 *  /privacy /firstInterview) are deliberately absent; customer stories live at /journeys because /stories is the app's. */
export const SITE_ROUTES: readonly SiteRoute[] = [
  { id: 'home', path: '/', Component: lazy(() => import('./pages/Home')) },
  { id: 'product', path: '/product/:slug?', Component: lazy(() => import('./pages/Product')) },
  { id: 'solution', path: '/for/:persona', Component: lazy(() => import('./pages/Solution')) },
  { id: 'pricing', path: '/pricing', Component: lazy(() => import('./pages/Pricing')) },
  { id: 'journeys', path: '/journeys', Component: lazy(() => import('./pages/Journeys')) },
  { id: 'journey', path: '/journeys/:slug', Component: lazy(() => import('./pages/JourneyDetail')) },
  { id: 'add-your-work', path: '/add-your-work', Component: lazy(() => import('./pages/AddYourWork')) },
  { id: 'add-your-work-detail', path: '/add-your-work/:slug', Component: lazy(() => import('./pages/AddYourWorkDetail')) },
  { id: 'notes', path: '/notes', Component: lazy(() => import('./pages/Notes')) },
  { id: 'note', path: '/notes/:slug', Component: lazy(() => import('./pages/NotePost')) },
  { id: 'why-mirror', path: '/why-mirror', Component: lazy(() => import('./pages/WhyMirror')) },
  { id: 'about', path: '/about', Component: lazy(() => import('./pages/About')) },
  { id: 'careers', path: '/careers', Component: lazy(() => import('./pages/Careers')) },
  { id: 'legal', path: '/legal/:doc', Component: lazy(() => import('./pages/Legal')) },
  { id: 'get-started', path: '/get-started', Component: lazy(() => import('./pages/GetStarted')) },
  { id: 'glossary', path: '/glossary', Component: lazy(() => import('./pages/Glossary')) },
  { id: 'resources', path: '/resources', Component: lazy(() => import('./pages/Resources')) },
  { id: 'kind-words', path: '/kind-words', Component: lazy(() => import('./pages/KindWords')) },
  { id: 'login', path: '/login', Component: null },
  { id: 'signup', path: '/signup', Component: null },
]

export interface SiteMatch {
  id: SiteRouteId
  params: Record<string, string>
  Component: SitePage | null
}

function matchPath(pattern: string, segs: string[]): Record<string, string> | null {
  const pat = pattern.split('/').filter(Boolean)
  const params: Record<string, string> = {}
  for (let i = 0; i < pat.length; i++) {
    const p = pat[i]
    const optional = p.endsWith('?')
    const name = optional ? p.slice(0, -1) : p
    const seg = segs[i]
    if (seg === undefined) { if (optional) continue; return null }
    if (name.startsWith(':')) {
      try { params[name.slice(1)] = decodeURIComponent(seg) } catch { return null }
    } else if (seg.toLowerCase() !== name) return null
  }
  return segs.length > pat.length ? null : params
}

/** Match a location pathname to a marketing route, or null (the app's own routes and unknown paths return null). */
export function matchSite(pathname: string): SiteMatch | null {
  const segs = pathname.split(/[?#]/)[0].split('/').filter(Boolean)
  for (const r of SITE_ROUTES) {
    const params = matchPath(r.path, segs)
    if (params) return { id: r.id, params, Component: r.Component }
  }
  return null
}

/** Client-side navigation that the app's popstate flow picks up. Same-page hashes just scroll. */
export function navigateSite(href: string): void {
  const url = new URL(href, window.location.href)
  const samePage = url.pathname === window.location.pathname && url.search === window.location.search
  window.history.pushState({}, '', url.pathname + url.search + url.hash)
  if (samePage && url.hash) {
    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView?.()
    return
  }
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
  if (!url.hash) window.scrollTo({ top: 0 })
}

/** An ordinary anchor (so middle-click, copy-link and open-in-new-tab work) that navigates without a reload. */
export function SiteLink({ href, onClick, target, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if ((target && target !== '_self') || !href.startsWith('/') || href.startsWith('//')) return
    e.preventDefault()
    navigateSite(href)
  }
  return <a href={href} target={target} onClick={handle} {...rest}>{children}</a>
}
