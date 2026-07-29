import { describe, expect, it } from 'vitest'

import { isThemeMode, readStoredTheme, resolveTheme } from './theme'

describe('Studio theme controller', () => {
  it('accepts only supported theme modes', () => {
    expect(isThemeMode('system')).toBe(true)
    expect(isThemeMode('sepia')).toBe(false)
  })

  it('resolves system mode through the media preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('falls back to system for an unknown stored value', () => {
    expect(readStoredTheme({ getItem: () => 'unknown' })).toBe('system')
  })
})
