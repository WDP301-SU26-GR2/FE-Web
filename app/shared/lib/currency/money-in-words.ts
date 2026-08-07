const VI_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'] as const
const EN_UNDER_TWENTY = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen'
] as const
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'] as const

export function formatVndInWords(value: number | null | undefined, locale: string): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const amount = Math.trunc(Math.abs(value))
  if (amount === 0) return locale.startsWith('vi') ? 'Không đồng' : 'Zero Vietnamese dong'
  const text = locale.startsWith('vi') ? `${readVietnameseNumber(amount)} đồng` : `${readEnglishNumber(amount)} Vietnamese dong`
  return value < 0 ? prefixNegative(text, locale) : capitalizeFirst(text)
}

function prefixNegative(value: string, locale: string) {
  return locale.startsWith('vi') ? `Âm ${value}` : `Negative ${value}`
}

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1)
}

function readVietnameseNumber(value: number) {
  const groups = splitThousands(value)
  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'] as const
  return groups
    .map((group, index) => {
      if (group === 0) return ''
      const scaleIndex = groups.length - index - 1
      return `${readVietnameseThreeDigits(group, index > 0)} ${scales[scaleIndex]}`.trim()
    })
    .filter(Boolean)
    .join(' ')
}

function readVietnameseThreeDigits(value: number, forceHundreds: boolean) {
  const hundred = Math.floor(value / 100)
  const ten = Math.floor((value % 100) / 10)
  const unit = value % 10
  const parts: string[] = []

  if (hundred > 0 || forceHundreds) {
    parts.push(`${VI_DIGITS[hundred]} trăm`)
    if (ten === 0 && unit > 0) parts.push('lẻ')
  }
  if (ten > 1) {
    parts.push(`${VI_DIGITS[ten]} mươi`)
    if (unit === 1) parts.push('mốt')
    else if (unit === 5) parts.push('lăm')
    else if (unit > 0) parts.push(VI_DIGITS[unit])
  } else if (ten === 1) {
    parts.push('mười')
    if (unit === 5) parts.push('lăm')
    else if (unit > 0) parts.push(VI_DIGITS[unit])
  } else if (unit > 0) {
    parts.push(VI_DIGITS[unit])
  }

  return parts.join(' ')
}

function readEnglishNumber(value: number): string {
  if (value < 1000) return readEnglishUnderThousand(value)
  const groups = splitThousands(value)
  const scales = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'] as const
  return groups
    .map((group, index) => {
      if (group === 0) return ''
      const scale = scales[groups.length - index - 1]
      return `${readEnglishUnderThousand(group)} ${scale}`.trim()
    })
    .filter(Boolean)
    .join(' ')
}

function readEnglishUnderThousand(value: number): string {
  const hundred = Math.floor(value / 100)
  const rest = value % 100
  const parts: string[] = []
  if (hundred > 0) parts.push(`${EN_UNDER_TWENTY[hundred]} hundred`)
  if (rest > 0) {
    if (rest < 20) parts.push(EN_UNDER_TWENTY[rest])
    else {
      const ten = Math.floor(rest / 10)
      const unit = rest % 10
      parts.push(unit ? `${EN_TENS[ten]}-${EN_UNDER_TWENTY[unit]}` : EN_TENS[ten])
    }
  }
  return parts.join(' ')
}

function splitThousands(value: number) {
  const groups: number[] = []
  let current = Math.trunc(value)
  while (current > 0) {
    groups.unshift(current % 1000)
    current = Math.floor(current / 1000)
  }
  return groups
}
