export type LifecycleActionResult =
  | { ok: true; intent: 'proposeCompletion' }
  | { ok: false; intent: string; errorKey: 'invalidAction' | 'invalidCompletionProposal' | 'proposeCompletionFailed' }
