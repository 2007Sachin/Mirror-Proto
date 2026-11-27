import { useSite } from './SiteContext'
import { Button } from './ui'
import { CTA } from './copy/shared'

/** The dark closing call-to-action band that ends most pages. The button runs the app's sign-in / start path. */
export default function Cta() {
  const { onTry } = useSite()
  return (
    <section className="ms-final" aria-labelledby="ms-final-h">
      <h2 id="ms-final-h" className="ms-final__h">{CTA.lead} <span className="ms-grad-text ms-grad-text--warm">{CTA.accent}</span></h2>
      <p className="ms-light-60" style={{ margin: '0 auto 28px', maxWidth: 460 }}>{CTA.body}</p>
      <Button variant="light" size="md" onClick={onTry}>{CTA.button}</Button>
    </section>
  )
}
