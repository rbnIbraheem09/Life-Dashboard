import { Navigate, useParams } from 'react-router-dom'
import { usePages } from '../store/pages'
import { PageRenderer } from '../blocks/PageRenderer'

/**
 * Resolves the dynamic page route. Renders the page if `:pageId` exists in the
 * store; otherwise redirects to the first page, or shows an empty state when
 * the dashboard has no pages. Used for `/`, `/p/:pageId`, and the `*` fallback.
 */
export function PageRoute() {
  const { pageId } = useParams()
  const order = usePages((s) => s.data.order)
  const hasPage = usePages((s) => (pageId ? pageId in s.data.pages : false))

  if (pageId && hasPage) return <PageRenderer pageId={pageId} />

  const first = order[0]
  if (first) return <Navigate to={`/p/${first}`} replace />
  return <EmptyPages />
}

function EmptyPages() {
  return (
    <div className="max-w-[1180px] mx-auto px-9 py-16 flex flex-col items-center justify-center text-center">
      <span className="iz-label" style={{ color: 'var(--accent-1)' }}>NO PAGES</span>
      <h1 className="iz-display text-3xl text-[var(--text)] mt-4 mb-2">Your dashboard is empty</h1>
      <p className="text-[14px] text-[var(--text-dim)] max-w-[420px]">
        Import a page from the sidebar to get started.
      </p>
    </div>
  )
}
