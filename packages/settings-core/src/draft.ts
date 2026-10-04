/** A component-local draft. Parsing and persistence remain with the consumer. */
export type SettingsDraft<T> = { text: string; confirmed: T; dirty: boolean };

export function createSettingsDraft<T>(confirmed: T, format: (value: T) => string): SettingsDraft<T> {
  return { text: format(confirmed), confirmed, dirty: false };
}

export function editSettingsDraft<T>(current: SettingsDraft<T>, text: string, format: (value: T) => string): SettingsDraft<T> {
  return { ...current, text, dirty: text !== format(current.confirmed) };
}

/** A clean draft follows external storage updates; an edited draft remains visible. */
export function syncSettingsDraft<T>(current: SettingsDraft<T>, confirmed: T, format: (value: T) => string): SettingsDraft<T> {
  const text = current.dirty ? current.text : format(confirmed);
  return { text, confirmed, dirty: text !== format(confirmed) };
}

/** Invalid input never becomes a confirmed value or a persistence request. */
export function planSettingsDraft<T>(current: SettingsDraft<T>, parse: (text: string) => T | null, equals: (a: T, b: T) => boolean = Object.is) {
  if (!current.dirty) return { value: current.confirmed, needsWrite: false };
  const value = parse(current.text);
  return { value, needsWrite: value !== null && !equals(value, current.confirmed) };
}

/** Call only after persistence succeeds; a failed write leaves the draft untouched. */
export function confirmSettingsDraft<T>(_current: SettingsDraft<T>, confirmed: T, format: (value: T) => string): SettingsDraft<T> {
  return createSettingsDraft(confirmed, format);
}
