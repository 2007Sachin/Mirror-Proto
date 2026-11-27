/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react'

/** What the app hands the marketing pages. `onTry` is the same path the landing page's button uses
 *  (signed in: workspace or first interview; signed out: the sign-in gate). Pages call `useSite().onTry()`. */
export interface SiteContextValue {
  onTry: () => void
}

const SiteContext = createContext<SiteContextValue>({ onTry: () => window.location.assign('/workspace') })

export const SiteProvider = SiteContext.Provider

/** Access the app hooks from any marketing page or component, no props needed. */
export function useSite(): SiteContextValue {
  return useContext(SiteContext)
}
