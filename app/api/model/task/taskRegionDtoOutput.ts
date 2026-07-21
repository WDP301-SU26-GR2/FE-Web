export type TaskRegionDtoOutput = {
  id: string
  pageId: string
  coordinates: {
    x: number
    y: number
    width: number
    height: number
  }
  regionType: string
  createdBy: string
  confirmedByMangaka: boolean
  confidenceScore: number | null
  detectedSubtype: string | null
  aiModelVersion: string | null
}
