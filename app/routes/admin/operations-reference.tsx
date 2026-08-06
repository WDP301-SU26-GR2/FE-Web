import { useLoaderData, type ClientActionFunctionArgs, type ClientLoaderFunctionArgs } from 'react-router'
import {
  magazineControllerCreateMagazine,
  magazineControllerDeleteMagazine,
  magazineControllerGetMagazines,
  magazineControllerUpdateMagazine
} from '~/api/operations/magazines/magazines'
import { seriesAdminControllerUpdateSlot } from '~/api/operations/admin-series/admin-series'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { surveyControllerGetSurveyPeriods } from '~/api/operations/survey/survey'
import { AdminReferencePage } from '~/features/admin'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'

export type AdminReferenceActionResult = {
  ok: boolean
  intent: string
  downloadUrl?: string
  expiresAt?: string
  message?: string
}

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const returnTo = safeReturnTo(search.get('returnTo'))

  const [seriesResponse, periods, magazines] = await Promise.all([
    loadAllOffsetItems((pagination) => seriesControllerListSeries(pagination).then((response) => response.data)),
    settle(surveyControllerGetSurveyPeriods()),
    settle(magazineControllerGetMagazines())
  ])

  return {
    series: seriesResponse,
    magazines: magazines?.items ?? [],
    periods: periods?.items ?? [],
    selected: {
      returnTo
    }
  }
}

export async function clientAction({ request }: ClientActionFunctionArgs): Promise<AdminReferenceActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')

  try {
    if (intent === 'createMagazine') {
      await magazineControllerCreateMagazine({
        name: required(form, 'name'),
        publicationTypes: publicationTypes(form)
      })
      return { ok: true, intent }
    }

    if (intent === 'updateMagazine') {
      await magazineControllerUpdateMagazine(
        { name: required(form, 'name') },
        {
          publicationTypes: publicationTypes(form)
        }
      )
      return { ok: true, intent }
    }

    if (intent === 'deleteMagazine') {
      await magazineControllerDeleteMagazine({ name: required(form, 'name') })
      return { ok: true, intent }
    }

    if (intent === 'updateSeriesSlot') {
      await seriesAdminControllerUpdateSlot(
        { id: required(form, 'seriesId') },
        {
          magazine: required(form, 'magazine'),
          startIssueNumber: integer(form, 'startIssueNumber'),
          publicationType: publicationType(form)
        }
      )
      return { ok: true, intent }
    }

    return { ok: false, intent, message: 'Unsupported action.' }
  } catch (error) {
    return {
      ok: false,
      intent,
      message: extractApiErrorMessage(error, 'Unable to complete the administrative action.')
    }
  }
}

async function settle<T>(promise: Promise<{ data: T } | { data: void }>): Promise<T | null> {
  try {
    const data = (await promise).data
    return data === undefined ? null : (data as T)
  } catch {
    return null
  }
}

function clean(value: string | null) {
  return value?.trim() ?? ''
}

function safeReturnTo(value: string | null) {
  const target = clean(value)
  return target.startsWith('/dashboard/admin') ? target : '/dashboard/admin/operations'
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function integer(form: FormData, key: string) {
  const value = Number(required(form, key))
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${key}`)
  return value
}

function publicationType(form: FormData) {
  const value = required(form, 'publicationType')
  if (value !== 'WEEKLY' && value !== 'MONTHLY' && value !== 'IRREGULAR') throw new Error('Invalid publicationType')
  return value
}

function publicationTypes(form: FormData) {
  const values = form
    .getAll('publicationTypes')
    .map(String)
    .filter((value) => value === 'WEEKLY' || value === 'MONTHLY' || value === 'IRREGULAR')
  if (!values.length) throw new Error('Missing publicationTypes')
  return [...new Set(values)] as Array<'WEEKLY' | 'MONTHLY' | 'IRREGULAR'>
}

export default function RouteComponent() {
  const loaderData = useLoaderData<typeof clientLoader>()
  return <AdminReferencePage {...loaderData} />
}
