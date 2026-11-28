// Resources hub copy. The guides and worksheets below are sample listings, not published files.
// TODO(placeholder): real guides, worksheets and field notes needed; link each card once the file exists.

export const RESOURCES_PAGE = {
  title: 'Resources',
  h1: 'Resources',
  sub: 'Guides, worksheets and short reads.',
  searchLabel: 'Search',
  searchPlaceholder: 'Search',
  empty: 'No resources match yet.',
  shown: 'resources shown',
  sampleLabel: 'Sample',
  soon: 'Sample listing. Not available yet.',
  filters: [{ id: 'guide', label: 'Guides' }, { id: 'worksheet', label: 'Worksheets' }, { id: 'note', label: 'Field notes' }],
} as const

export interface Resource { id: string; kind: 'guide' | 'worksheet' | 'note'; kindLabel: string; title: string; gradient: string }
export const RESOURCES: Resource[] = [
  { id: 'first-session', kind: 'guide', kindLabel: 'Guide', title: 'A gentle guide to your first session', gradient: 'linear-gradient(135deg,#f0c0ff,#c8c4ea)' },
  { id: 'story-shape', kind: 'worksheet', kindLabel: 'Worksheet', title: 'Story shape worksheet', gradient: 'linear-gradient(135deg,#ffbd7e,#dc93c3)' },
  { id: 'reflection-kindly', kind: 'note', kindLabel: 'Field note', title: 'Reading your reflection kindly', gradient: 'linear-gradient(135deg,#b7efb2,#79e7dc)' },
  { id: 'target-role', kind: 'guide', kindLabel: 'Guide', title: 'Choosing your target role', gradient: 'linear-gradient(135deg,#79e7dc,#c8c4ea)' },
  { id: 'number-sentence', kind: 'worksheet', kindLabel: 'Worksheet', title: 'One-sentence number practice', gradient: 'linear-gradient(135deg,#ffbd7e,#c8c4ea)' },
  { id: 'plans-change', kind: 'note', kindLabel: 'Field note', title: 'When plans change mid-project', gradient: 'linear-gradient(135deg,#f0c0ff,#c8c4ea)' },
]
