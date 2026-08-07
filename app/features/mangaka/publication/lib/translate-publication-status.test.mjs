import test from 'node:test'
import assert from 'node:assert/strict'

import { formatProductionStageOption } from './translate-publication-status.ts'

test('formats production stage options with the localized built-in stage name', () => {
  const translate = (key, options) => {
    if (key === 'seriesDetail.production.productionStage.INKING') return 'Đi nét'
    if (key === 'studio.tasks.composer.stageOption') return `Giai đoạn ${options.order}: ${options.name}`
    return key
  }

  assert.equal(formatProductionStageOption(1, 'INKING', translate), 'Giai đoạn 1: Đi nét')
})
