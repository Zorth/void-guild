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
  tutorial_completed: { title: 'Tutorial Completed!', category: 'normal' },
  secret_logo_clicks: { title: 'Curious Clicker', category: 'hidden' },
  gm_favor: { title: "Master's Favor", category: 'hidden' },
  system_polymath: { title: 'System Polymath', category: 'hidden' },
}


export const FONT_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default (Sans)', unlockedByDefault: true, value: 'font-sans' },
]

export const COLOR_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Theme', unlockedByDefault: true, value: '' },
  {
    id: 'purple_text',
    name: 'Purple Accent',
    unlockedByDefault: false,
    requiredAchievementId: 'tutorial_completed',
    value: '#D8B4FE',
  },
  {
    id: 'rainbow',
    name: 'Moving Rainbow (RGB)',
    unlockedByDefault: false,
    requiredAchievementId: 'secret_logo_clicks',
    value: 'rainbow-text',
    previewClass: 'rainbow-text font-bold',
  },
]

export const BORDER_SHAPE_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Solid', unlockedByDefault: true, value: 'rounded-lg border border-border' },
  {
    id: 'purple_border',
    name: 'Purple Highlight Border',
    unlockedByDefault: false,
    requiredAchievementId: 'tutorial_completed',
    value: 'rounded-lg border-2 border-[#D8B4FE] bg-[rgba(147,51,234,0.1)]',
    previewClass: 'rounded-lg border-2 border-[#D8B4FE] bg-[rgba(147,51,234,0.1)] p-1',
  },
  {
    id: 'rainbow_border',
    name: 'Moving Rainbow Border',
    unlockedByDefault: false,
    requiredAchievementId: 'secret_logo_clicks',
    value: 'rounded-lg rainbow-border',
    previewClass: 'rainbow-border rounded-lg p-1',
  },
]

export const PROFILE_BORDER_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Ring', unlockedByDefault: true, value: 'border border-border' },
]

export const BG_COLOR_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Tint', unlockedByDefault: true, value: '' },
  {
    id: 'purple_tint',
    name: 'Purple Tint',
    unlockedByDefault: false,
    requiredAchievementId: 'tutorial_completed',
    value: 'rgba(147, 51, 234, 0.15)',
  },
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
      subtitleClassName: 'font-normal opacity-80',
      subtitleStyle: { opacity: 0.8 },
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
  const shapeObj = BORDER_SHAPE_OPTIONS.find((s) => s.id === cosmetics.borderShape || s.value === cosmetics.borderShape)
  let cardClassName = shapeObj ? shapeObj.value : ''

  // Profile Border
  const profileObj = PROFILE_BORDER_OPTIONS.find((p) => p.id === cosmetics.profileBorder)
  const profileRingClassName = profileObj ? profileObj.value : 'border border-border'

  // Card Background
  const bgObj = BG_COLOR_OPTIONS.find((b) => b.id === cosmetics.bgColor)
  const cardBgStyle = bgObj && bgObj.value ? { backgroundColor: bgObj.value } : cosmetics.bgColor ? { backgroundColor: cosmetics.bgColor } : {}

  // Card Border Color
  let cardBorderStyle: React.CSSProperties = {}
  if (cosmetics.borderColor && cosmetics.borderColor !== 'rainbow') {
    cardBorderStyle = { borderColor: cosmetics.borderColor }
  }

  const cardStyle: React.CSSProperties = {
    ...cardBgStyle,
    ...cardBorderStyle,
  }

  // Name Style & Class
  const colorObj = COLOR_OPTIONS.find((c) => c.id === cosmetics.nameColor || c.value === cosmetics.nameColor)
  let nameClassName = nameFontVal
  let nameStyle: React.CSSProperties = {}

  if (colorObj?.value === 'rainbow-text' || cosmetics.nameColor === 'rainbow' || cosmetics.nameColor === 'rainbow-text') {
    nameClassName = `${nameClassName} rainbow-text font-bold`
    nameStyle = {}
  } else if (colorObj?.value) {
    nameStyle = { color: colorObj.value }
  } else if (cosmetics.nameColor) {
    nameStyle = { color: cosmetics.nameColor }
  }

  // Subtitle Style & Class (Always translucent with opacity 0.8)
  const subColorObj = COLOR_OPTIONS.find((c) => c.id === cosmetics.subtitleColor || c.value === cosmetics.subtitleColor)
  let subtitleClassName = `${subFontVal} font-normal opacity-80`
  let subtitleStyle: React.CSSProperties = { opacity: 0.8 }

  if (subColorObj?.value === 'rainbow-text' || cosmetics.subtitleColor === 'rainbow' || cosmetics.subtitleColor === 'rainbow-text') {
    subtitleClassName = `${subtitleClassName} rainbow-text`
  } else if (subColorObj?.value) {
    subtitleStyle = { color: subColorObj.value, opacity: 0.8 }
  } else if (cosmetics.subtitleColor) {
    subtitleStyle = { color: cosmetics.subtitleColor, opacity: 0.8 }
  }

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
