/** Props every lazy page component receives from the router. `params` holds the matched `:name` segments (decoded). */
export interface SitePageProps {
  params: Record<string, string>
}
