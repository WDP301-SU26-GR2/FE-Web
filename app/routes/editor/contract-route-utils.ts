import { contractControllerCheckStatus, contractControllerGetContractById } from '~/api/operations/contracts/contracts'

export async function loadContractBase(id: string) {
  const [contract, progress] = await Promise.all([
    contractControllerGetContractById({ id }),
    contractControllerCheckStatus({ id }).catch(() => null)
  ])
  return { contract: contract.data, progress: progress?.data ?? null }
}

export function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export function paymentThreshold(form: FormData) {
  const type = required(form, 'conditionType')
  if (type === 'CHAPTER_MILESTONE') return { chapter: Number(required(form, 'chapter')) }
  if (type === 'RECURRING_CHAPTER') return { every: Number(required(form, 'every')) }
  if (type === 'RANKING_MILESTONE') return { topRank: Number(required(form, 'topRank')) }
  if (type === 'TIME_BOUND') return { deadline: required(form, 'deadline') }
  throw new Error('Invalid condition type')
}

export function clauses(form: FormData) {
  return required(form, 'changedClauses')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
