export function isEnumValue<T extends string>(values: Record<string, T>, value: string): value is T {
  return Object.values(values).includes(value as T)
}
