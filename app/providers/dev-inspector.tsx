import { lazy, Suspense, useEffect, useState } from 'react'

/**
 * react-dev-inspector bridge component.
 *
 * Hold Shift + click on any element in the browser → the plugin opens the
 * source file at the corresponding line in your IDE.
 *
 * We load the inspector lazily on the client because:
 *   1. The library touches the DOM on mount, which would cause SSR
 *      hydration mismatches if rendered on the server.
 *   2. It is dev-only — production bundles strip the import via the
 *      `import.meta.env.DEV` check below.
 */
const Inspector = lazy(() =>
  import('react-dev-inspector').then((m) => ({ default: m.Inspector }))
)

export function DevInspector() {
  const [shouldRender, setShouldRender] = useState(false)

  // Deliberate SSR hydration gate — the `/* eslint-disable */` block below silences
  // the rule that flags setState in effects. This is the standard pattern
  // recommended by Sonner's SSR docs (https://github.com/emilkowalski/sonner/issues/695)
  // and applies equally here since react-dev-inspector manipulates the DOM on mount.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (import.meta.env.DEV) setShouldRender(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  if (!shouldRender) return null

  return (
    <Suspense fallback={null}>
      <Inspector keys={['shift']} disableLaunchEditor={false} />
    </Suspense>
  )
}
