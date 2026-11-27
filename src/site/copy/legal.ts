// Legal pages copy. ALL TEXT IS PLACEHOLDER lorem-style legal text. It states nothing about how MIRROR handles data.
// TODO(placeholder): real privacy policy and terms of use from counsel before launch. Do not reuse anyone else's text.

export const LEGAL_PAGE = {
  banner: 'Placeholder — real text from counsel before launch',
  updatedLabel: 'Last updated',
  updated: 'placeholder date',
  tocLabel: 'Sections',
  contactH: 'Something not covered here?',
  contactP: 'Write to us and we will reply kindly.',
  contactCta: 'Contact us',
  contactHref: '/about', // TODO(placeholder): real contact address or form
  notFoundBack: 'Home',
} as const

const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'

export interface LegalDoc { title: string; sub: string; sections: { h: string; p: string }[] }
// TODO(placeholder): replace every section body with counsel-approved text.
export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    title: 'Privacy at MIRROR',
    sub: 'Placeholder legal page layout. Have your real policy written and reviewed; do not reuse anyone else’s text.',
    sections: [
      { h: 'What we collect', p: `Placeholder. ${LOREM}` },
      { h: 'How we use it', p: `Placeholder. ${LOREM}` },
      { h: 'Who can see your sessions', p: 'Placeholder. Only describe protections the product really has.' },
      { h: 'Keeping your data safe', p: `Placeholder. ${LOREM}` },
      { h: 'Contact', p: `Placeholder. ${LOREM}` },
    ],
  },
  terms: {
    title: 'Terms of use',
    sub: 'Placeholder legal page layout. Have your real terms written and reviewed; do not reuse anyone else’s text.',
    sections: [
      { h: 'Using MIRROR', p: `Placeholder. ${LOREM}` },
      { h: 'Your account', p: `Placeholder. ${LOREM}` },
      { h: 'Your content', p: `Placeholder. ${LOREM}` },
      { h: 'Changes to these terms', p: `Placeholder. ${LOREM}` },
      { h: 'Contact', p: `Placeholder. ${LOREM}` },
    ],
  },
}
