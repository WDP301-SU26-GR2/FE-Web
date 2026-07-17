import { useEffect } from 'react'
import { useNavigate } from 'react-router'

/**
 * `/publish/:seriesId/:chapterId` deep-redirects into the Name view. Name is
 * the natural starting point in the chapter-first model — the user can't
 * create pages until the Editor approves the storyboard, so the Names tab is
 * always the first action the user takes.
 */
export default function ChapterIndex() {
  const navigate = useNavigate()
  useEffect(() => {
    // Resolved at runtime — using window.location keeps the URL stable as a
    // fallback in case the router has not yet mounted when the effect fires.
    navigate(`${window.location.pathname.replace(/\/$/, '')}/name`, { replace: true })
  }, [navigate])
  return null
}
