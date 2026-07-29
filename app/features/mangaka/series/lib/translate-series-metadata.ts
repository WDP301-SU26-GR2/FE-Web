type Translate = (key: string) => string

const GENRE_KEYS: Record<string, string> = {
  ACTION: 'wizard.enums.genres.ACTION',
  ADVENTURE: 'wizard.enums.genres.ADVENTURE',
  COMEDY: 'wizard.enums.genres.COMEDY',
  DRAMA: 'wizard.enums.genres.DRAMA',
  FANTASY: 'wizard.enums.genres.FANTASY',
  HORROR: 'wizard.enums.genres.HORROR',
  MYSTERY: 'wizard.enums.genres.MYSTERY',
  ROMANCE: 'wizard.enums.genres.ROMANCE',
  SCI_FI: 'wizard.enums.genres.SCI_FI',
  SLICE_OF_LIFE: 'wizard.enums.genres.SLICE_OF_LIFE',
  SPORTS: 'wizard.enums.genres.SPORTS',
  SUPERNATURAL: 'wizard.enums.genres.SUPERNATURAL',
  THRILLER: 'wizard.enums.genres.THRILLER',
  HISTORICAL: 'wizard.enums.genres.HISTORICAL',
  ISEKAI: 'wizard.enums.genres.ISEKAI',
  MECHA: 'wizard.enums.genres.MECHA',
  PSYCHOLOGICAL: 'wizard.enums.genres.PSYCHOLOGICAL'
}

const DEMOGRAPHIC_KEYS: Record<string, string> = {
  SHONEN: 'wizard.enums.demographic.SHONEN',
  SEINEN: 'wizard.enums.demographic.SEINEN',
  SHOJO: 'wizard.enums.demographic.SHOJO',
  JOSEI: 'wizard.enums.demographic.JOSEI',
  KODOMO: 'wizard.enums.demographic.KODOMO'
}

const PUBLICATION_TYPE_KEYS: Record<string, string> = {
  WEEKLY: 'wizard.enums.publicationType.WEEKLY',
  MONTHLY: 'wizard.enums.publicationType.MONTHLY',
  IRREGULAR: 'wizard.enums.publicationType.IRREGULAR'
}

export function translateGenre(genre: string | null | undefined, t: Translate): string {
  return t(GENRE_KEYS[genre ?? ''] ?? 'state.unknown')
}

export function formatGenres(genres: readonly string[], t: Translate): string {
  return genres.map((genre) => translateGenre(genre, t)).join(' · ')
}

export function translateDemographic(demographic: string | null | undefined, t: Translate): string {
  return t(DEMOGRAPHIC_KEYS[demographic ?? ''] ?? 'state.unknown')
}

export function translatePublicationType(publicationType: string | null | undefined, t: Translate): string {
  return t(PUBLICATION_TYPE_KEYS[publicationType ?? ''] ?? 'state.unknown')
}
