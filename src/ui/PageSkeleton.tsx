import './skeleton.css'

/** Quiet placeholder bars while a page waits for its data. Use instead of empty-state or placeholder copy: it says nothing that could change. */
export default function PageSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div className="workspace-skeleton" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => <span key={i} />)}
    </div>
  )
}
