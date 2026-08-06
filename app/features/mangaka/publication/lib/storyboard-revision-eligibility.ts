export type StoryboardRevisionEligibilityInput = {
  hasStoryboard: boolean
  status: string | null | undefined
  isLoading: boolean
  hasError: boolean
  revisions: ReadonlyArray<{ isResolved: boolean }>
}

export type StoryboardRevisionEligibility = {
  hasOpenRevisions: boolean
  showRevisionNotice: boolean
  canResubmit: boolean
}

/**
 * Keeps the Name action bar in sync with the Editor's revision requests.
 * A revision status alone is not enough: the Mangaka must acknowledge every
 * open request before the API resubmit action is exposed.
 */
export function getStoryboardRevisionEligibility(
  input: StoryboardRevisionEligibilityInput
): StoryboardRevisionEligibility {
  const hasOpenRevisions = input.revisions.some((revision) => !revision.isResolved)
  const isRevision = input.hasStoryboard && input.status === 'REVISION'

  return {
    hasOpenRevisions,
    showRevisionNotice: isRevision && (input.isLoading || input.hasError || hasOpenRevisions),
    canResubmit: isRevision && !input.isLoading && !input.hasError && !hasOpenRevisions
  }
}
