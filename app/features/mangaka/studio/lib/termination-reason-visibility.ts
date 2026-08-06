/**
 * The assignment list omits termination details. `undefined` therefore means
 * the detail request has not supplied a value yet; `null`/empty means it has
 * loaded and the assignment has no recorded reason.
 */
export function hasLoadedTerminationReason(terminatedReason: string | null | undefined): boolean {
  return terminatedReason !== undefined
}
