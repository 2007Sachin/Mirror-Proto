// Copy shared by every marketing page: nav, footer and the closing call to action.
// Rules: docs and design-ref copy guide lists (see lint.test.ts), no score / percentage / streak wording, and no
// privacy or security claim beyond the audited list in src/pages/landing/content.ts (CLAIMS). Keep it plain.

export const BRAND = 'MIRROR'

export const SKIP_LINK = 'Skip to content'

export interface NavItem { label: string; desc: string; href: string }
export interface NavGroup { label: string; items: NavItem[] }

// TODO(placeholder): the /product/:slug, /for/:persona and /add-your-work slugs below are guesses; the page agents own the final slugs.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Product',
    items: [
      { label: 'Speak or type', desc: 'Answer out loud or in writing', href: '/product/voice' },
      { label: 'Say it again', desc: 'Answer once more and see what changed', href: '/product/say-it-again' },
      { label: 'Your job, your résumé', desc: 'See which skills your résumé backs', href: '/product/job-match' },
      { label: 'Add your work', desc: 'Start from what you have made', href: '/add-your-work' },
    ],
  },
  {
    label: 'For you',
    items: [
      { label: 'Students', desc: 'Your first big conversations', href: '/for/students' },
      { label: 'Career changers', desc: 'Tell a new story with confidence', href: '/for/career-changers' },
      { label: 'Why MIRROR', desc: 'How it compares to practising alone', href: '/why-mirror' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { label: 'Notes', desc: 'Short reads on talking about your work', href: '/notes' },
      { label: 'Resources', desc: 'Guides and worksheets', href: '/resources' },
      { label: 'Glossary', desc: 'Plain words for common terms', href: '/glossary' },
    ],
  },
  {
    label: 'Company',
    items: [
      { label: 'About', desc: 'Who we are', href: '/about' },
      { label: 'Journeys', desc: 'How people prepared', href: '/journeys' },
      { label: 'Kind words', desc: 'What people have said', href: '/kind-words' },
      { label: 'Careers', desc: 'Open roles', href: '/careers' },
    ],
  },
]

/** Single links shown beside the dropdowns. */
export const NAV_LINKS: { label: string; href: string }[] = [{ label: 'Pricing', href: '/pricing' }]

export const NAV_CTA = {
  signIn: 'Sign in',
  primary: 'Request access',
  menuLabel: 'Menu',
  closeLabel: 'Close menu',
  homeLabel: 'MIRROR home',
  mainLabel: 'Main',
} as const

export type FooterLink = { label: string; href: string } | { label: string; action: 'signIn' }

export const FOOTER: { columns: { title: string; links: FooterLink[] }[]; line: string; byline: string } = {
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Product', href: '/product' },
        { label: 'Add your work', href: '/add-your-work' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Get started', href: '/get-started' },
      ],
    },
    {
      title: 'Learn',
      links: [
        { label: 'Notes', href: '/notes' },
        { label: 'Resources', href: '/resources' },
        { label: 'Glossary', href: '/glossary' },
        { label: 'Why MIRROR', href: '/why-mirror' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Careers', href: '/careers' },
        { label: 'Journeys', href: '/journeys' },
        { label: 'Kind words', href: '/kind-words' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', href: '/legal/privacy' },
        { label: 'Terms', href: '/legal/terms' },
        { label: 'Sign in', action: 'signIn' },
      ],
    },
  ],
  byline: 'Interview practice for data and analytics roles',
  line: 'MIRROR is in beta.',
}

/** The dark closing band. `accent` is set in the gradient colour. */
export const CTA = {
  lead: 'Bring the job',
  accent: 'you want.',
  body: 'Request access, then start with a sample or with your own job.',
  button: 'Request access',
} as const
