import { useState } from 'react'
import SiteLayout from '../SiteLayout'
import { BillingToggle, Button, Faq, PriceSwap, Reveal } from '../ui'
import { PRICING as P } from '../copy/pricing'
import './pricing.css'

export default function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  return (
    <SiteLayout title="Pricing" navTheme="dark">
      <section className="ms-dark-hero ms-pr-hero">
        <div className="ms-phero__eyebrow"><i />{P.eyebrow}<span className="ms-pr-badge">{P.sampleBadge}</span></div>
        <h1 className="ms-h1">{P.h1[0]}{" "}<br />{P.h1[1]}</h1>
        <p className="ms-phero__sub">{P.sub}</p>
        <BillingToggle value={billing} onChange={setBilling} label={P.toggleLabel} monthlyLabel={P.monthlyLabel} yearlyLabel={P.yearlyLabel} />
        <p className="ms-pr-note">{P.sampleNote}</p>
        {/* TODO(placeholder): sample plans and prices, replace with real offers */}
        <div className="ms-plans">
          {P.plans.map(pl => (
            <Reveal key={pl.name} className={`ms-plan${pl.featured ? ' ms-plan--featured' : ''}`}>
              {pl.featured && <span className="ms-pr-flag">{P.featuredTag}</span>}
              <h3>{pl.name}</h3>
              <div className="ms-plan__price"><PriceSwap value={billing} monthly={pl.monthly} yearly={pl.yearly} /> {pl.unit && <small>{pl.unit}</small>}</div>
              <p>{pl.blurb}</p>
              <ul>{pl.features.map(f => <li key={f}>{f}</li>)}</ul>
              <Button variant={pl.featured ? 'primary' : 'light'} href={pl.href}>{pl.cta}</Button>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="ms-sec">
        <div className="ms-sec__head"><h2 className="ms-h2-sm">{P.tableTitle}<span className="ms-pr-badge">{P.sampleBadge}</span></h2></div>
        <div className="ms-pr-tablewrap">
          <div className="ms-ptable" role="table" aria-label={P.tableLabel} tabIndex={0}>
            <div className="ms-ptable__row ms-ptable__head" role="row">
              <span role="columnheader" />
              {P.plans.map(pl => <span key={pl.name} role="columnheader">{pl.name}</span>)}
            </div>
            {P.groups.map(g => (
              <div key={g.name} role="rowgroup">
                <div className="ms-ptable__row" role="row"><span className="ms-ptable__group" role="rowheader">{g.name}</span></div>
                {g.rows.map(r => (
                  <div key={r.label} className="ms-ptable__row" role="row">
                    <span role="rowheader">{r.label}</span>
                    {r.cells.map((c, i) => (
                      <span key={i} role="cell">
                        {typeof c === 'string' ? c
                          : c ? <span className="ms-yes" role="img" aria-label={P.yes}>✓</span>
                            : <span className="ms-no" role="img" aria-label={P.no}>—</span>}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="ms-sec ms-sec--tight ms-pr-help">
        <h2 className="ms-h2-sm">{P.helpTitle}</h2>
        <p className="ms-mock__muted">{P.helpText}</p>
        <Button size="md" href={P.helpHref}>{P.helpCta}</Button>
      </section>
      <section className="ms-sec">
        <div className="ms-sec__head ms-sec__head--center"><h2 className="ms-h2-sm">{P.faqTitle}</h2></div>
        <Faq items={P.faq} />
      </section>
    </SiteLayout>
  )
}
