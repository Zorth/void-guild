import React from 'react'

export interface CosmeticOption {
  id: string
  name: string
  unlockedByDefault: boolean
  requiredAchievementId?: string
  value: string
  previewClass?: string
  previewStyle?: React.CSSProperties
}

export interface AchievementInfo {
  title: string
  category: 'normal' | 'hidden'
}

export const ACHIEVEMENT_INFO: Record<string, AchievementInfo> = {
  first_character: { title: 'First Steps', category: 'normal' },
  character_trio: { title: 'Roster of Heroes', category: 'normal' },
  first_session: { title: 'Into the Void', category: 'normal' },
  veteran_player_5: { title: 'Seasoned Adventurer', category: 'normal' },
  master_player_10: { title: 'Guild Champion', category: 'normal' },
  first_gm_session: { title: 'Behind the Screen', category: 'normal' },
  veteran_gm_5: { title: 'Master Storyteller', category: 'normal' },
  level_5_char: { title: 'Rising Power', category: 'normal' },
  level_10_char: { title: 'Legendary Hero', category: 'normal' },
  first_commendation: { title: 'Party Favorite', category: 'normal' },
  secret_logo_clicks: { title: 'Curious Clicker', category: 'hidden' },
  gm_favor: { title: "Master's Favor", category: 'hidden' },
  system_polymath: { title: 'System Polymath', category: 'hidden' },
}


export const FONT_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default (Sans)', unlockedByDefault: true, value: 'font-sans' },
]

export const COLOR_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Theme', unlockedByDefault: true, value: '' },
]

export const BORDER_SHAPE_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Solid', unlockedByDefault: true, value: 'rounded-lg border' },
]

export const PROFILE_BORDER_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Ring', unlockedByDefault: true, value: 'border border-border' },
]

export const BG_COLOR_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Tint', unlockedByDefault: true, value: '' },
]

export interface CharacterCosmetics {
  nameFont?: string
  subtitleFont?: string
  nameColor?: string
  subtitleColor?: string
  borderShape?: string
  borderColor?: string
  profileBorder?: string
  bgColor?: string
}

export function resolveCosmeticsStyles(cosmetics?: CharacterCosmetics | null) {
  if (!cosmetics) {
    return {
      cardClassName: '',
      cardStyle: {},
      nameClassName: '',
      nameStyle: {},
      subtitleClassName: 'font-normal opacity-75',
      subtitleStyle: {},
      profileRingClassName: 'border border-border',
    }
  }

  // Name Font
  const nameFontObj = FONT_OPTIONS.find((f) => f.id === cosmetics.nameFont)
  const nameFontVal = nameFontObj ? nameFontObj.value : ''

  // Subtitle Font
  const subFontObj = FONT_OPTIONS.find((f) => f.id === cosmetics.subtitleFont)
  const subFontVal = subFontObj ? subFontObj.value : ''

  // Border Shape
  const shapeObj = BORDER_SHAPE_OPTIONS.find((s) => s.id === cosmetics.borderShape)
  const cardClassName = shapeObj ? shapeObj.value : ''

  // Profile Border
  const profileObj = PROFILE_BORDER_OPTIONS.find((p) => p.id === cosmetics.profileBorder)
  const profileRingClassName = profileObj ? profileObj.value : 'border border-border'

  // Card Background
  const bgObj = BG_COLOR_OPTIONS.find((b) => b.id === cosmetics.bgColor)
  const cardBgStyle = bgObj && bgObj.value ? { backgroundColor: bgObj.value } : cosmetics.bgColor ? { backgroundColor: cosmetics.bgColor } : {}

  // Card Border Color
  const cardBorderStyle = cosmetics.borderColor ? { borderColor: cosmetics.borderColor } : {}

  const cardStyle: React.CSSProperties = {
    ...cardBgStyle,
    ...cardBorderStyle,
  }

  // Name Style
  const nameStyle: React.CSSProperties = cosmetics.nameColor ? { color: cosmetics.nameColor } : {}
  const nameClassName = nameFontVal

  // Subtitle Style (non-bold, slightly darker opacity version)
  const subtitleStyle: React.CSSProperties = cosmetics.subtitleColor
    ? { color: cosmetics.subtitleColor, opacity: 0.8 }
    : {}
  const subtitleClassName = `${subFontVal} font-normal`

  return {
    cardClassName,
    cardStyle,
    nameClassName,
    nameStyle,
    subtitleClassName,
    subtitleStyle,
    profileRingClassName,
  }
}
