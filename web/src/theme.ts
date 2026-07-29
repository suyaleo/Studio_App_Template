export type ThemeMode = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'studio-theme'

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

export function readStoredTheme(storage: Pick<Storage, 'getItem'> = window.localStorage): ThemeMode {
  const stored = storage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(stored) ? stored : 'system'
}
