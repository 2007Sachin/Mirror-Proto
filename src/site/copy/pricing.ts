// Copy for /pricing. Wording follows scaffold/pricing.html. Plans and prices are SAMPLES, not real offers.

export interface Plan {
  name: string; monthly: string; yearly: string; unit: string; blurb: string; features: string[]
  cta: string; href: string; featured?: boolean
}

export const PRICING = {
  eyebrow: 'Pricing',
  h1: ['Choose how often', 'you want to practice'],
  sub: 'Sample plans and prices for layout only. Replace with your real offer.',
  sampleBadge: 'Sample',
  sampleNote: 'Sample plans and prices. Nothing here is an offer.',
  featuredTag: 'Sample highlight',
  toggleLabel: 'Bill yearly',
  monthlyLabel: 'Monthly',
  yearlyLabel: 'Yearly',
  perMonth: '/ month',
  // TODO(placeholder): sample plans and prices, replace with real offers
  plans: [
    { name: 'Starter', monthly: '$0', yearly: '$0', unit: '/ month', blurb: 'Try a few sessions and see how it feels.', features: ['3 practice sessions', 'Reflection Guide', 'Your sessions list'], cta: 'Start free', href: '/get-started' },
    { name: 'Plus', monthly: '$12', yearly: '$9', unit: '/ month', blurb: 'Practice as often as you like.', features: ['Unlimited sessions', 'Deeper Questions', 'Experience library', 'Your summary, any time'], cta: 'Choose Plus', href: '/get-started', featured: true },
    { name: 'Teams', monthly: 'Custom', yearly: 'Custom', unit: '', blurb: 'For schools, bootcamps and career services.', features: ['Everything in Plus', 'Group setup', 'Shared resources'], cta: 'Talk to us', href: '/get-started' },
  ] as Plan[],
  tableTitle: 'Compare plans',
  tableLabel: 'Compare plans (sample)',
  yes: 'Included',
  no: 'Not included',
  groups: [
    {
      name: 'Practice', rows: [
        { label: 'Practice sessions', cells: ['3', 'Unlimited', 'Unlimited'] },
        { label: 'Mirror Voice', cells: [true, true, true] },
        { label: 'Deeper Questions', cells: [false, true, true] },
        { label: 'Choose your target role', cells: [true, true, true] },
      ],
    },
    {
      name: 'Reflection', rows: [
        { label: 'Reflection Guide', cells: [true, true, true] },
        { label: 'Your summary', cells: [false, true, true] },
        { label: 'Try again', cells: [true, true, true] },
      ],
    },
    {
      name: 'Your space', rows: [
        { label: 'Experience library', cells: [false, true, true] },
        { label: 'Group setup', cells: [false, false, true] },
      ],
    },
  ] as { name: string; rows: { label: string; cells: (string | boolean)[] }[] }[],
  helpTitle: 'Not sure which plan fits?',
  helpText: 'Tell us a little about you and we will suggest one.',
  helpCta: 'Get in touch',
  helpHref: '/get-started',
  faqTitle: 'Questions people ask',
  faq: [
    { q: 'Can I change plans later?', a: 'Yes, any time.' },
    { q: 'Is there a free plan?', a: 'Starter lets you try a few sessions at no cost (sample copy).' },
    { q: 'Do you offer plans for schools?', a: 'Yes. Teams is built for groups.' },
  ],
}
