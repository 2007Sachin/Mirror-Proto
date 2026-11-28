import SiteLayout from '../SiteLayout'
import { Button } from '../ui'
import { NOT_FOUND } from '../copy/slug-not-found'

/** Friendly not-found for an unknown detail slug, shown inside the site shell. */
export default function SlugNotFound({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <SiteLayout title="Not found">
      <div className="ms-phero ms-phero--left" style={{ maxWidth: 'var(--ms-container)', margin: '0 auto' }}>
        <h1 className="ms-h1--md">{NOT_FOUND.title}</h1>
        <p className="ms-phero__sub">{NOT_FOUND.body}</p>
        <Button href={backHref} variant="secondary" size="md">{NOT_FOUND.back} {backLabel}</Button>
      </div>
    </SiteLayout>
  )
}
