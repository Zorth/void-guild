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
  character_trio: { title: 'Roster of Heroes', category: 'hidden' },
  first_session: { title: 'Into the Void', category: 'normal' },
  veteran_player_5: { title: 'Seasoned Adventurer', category: 'normal' },
  master_player_10: { title: 'Guild Champion', category: 'normal' },
  first_gm_session: { title: 'Behind the Screen', category: 'normal' },
  veteran_gm_5: { title: 'Master Storyteller', category: 'normal' },
  level_5_char: { title: 'Rising Power', category: 'normal' },
  level_10_char: { title: 'Legendary Hero', category: 'normal' },
  first_commendation: { title: 'Party Favorite', category: 'normal' },
  tutorial_completed: { title: 'Tutorial Completed!', category: 'normal' },
  link_discord: { title: 'Discord Connected', category: 'normal' },
  visit_leaderboard: { title: 'Leaderboard Inspector', category: 'hidden' },
  rank_journeyman: { title: 'Journeyman Adventurer', category: 'normal' },
  rank_guildmaster: { title: "Guildmaster's Pinnacle", category: 'normal' },
  secret_logo_clicks: { title: 'Curious Clicker', category: 'hidden' },
  gm_favor: { title: "Master's Favor", category: 'hidden' },
  comm_roleplay: { title: 'Roleplay Maestro', category: 'hidden' },
  comm_tactics: { title: 'Tactical Mastermind', category: 'hidden' },
  comm_clutch: { title: 'Clutch Performer', category: 'hidden' },
  comm_heroic: { title: 'Heroic Legend', category: 'hidden' },
  system_polymath: { title: 'System Polymath', category: 'hidden' },
}


export const FONT_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default (Sans)', unlockedByDefault: true, value: 'font-sans' },
  {
    id: 'sabon_serif',
    name: 'Sabon Serif',
    unlockedByDefault: false,
    requiredAchievementId: 'first_session',
    value: 'font-sabon',
  },
  {
    id: 'medieval_sharp',
    name: 'Medieval Sharp',
    unlockedByDefault: false,
    requiredAchievementId: 'veteran_player_5',
    value: 'font-medieval',
  },
  {
    id: 'taroca_fantasy',
    name: 'Taroca Calligraphic',
    unlockedByDefault: false,
    requiredAchievementId: 'master_player_10',
    value: 'font-taroca',
  },
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
    id: 'teal_text',
    name: 'Teal Accent',
    unlockedByDefault: false,
    requiredAchievementId: 'character_trio',
    value: '#2DD4BF',
  },
  {
    id: 'amber_text',
    name: 'Warm Amber Accent',
    unlockedByDefault: false,
    requiredAchievementId: 'first_commendation',
    value: '#FBBF24',
  },
  {
    id: 'gold_text',
    name: 'Guildmaster Gold Text',
    unlockedByDefault: false,
    requiredAchievementId: 'rank_guildmaster',
    value: 'gold-text',
    previewClass: 'gold-text font-extrabold',
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
    id: 'silver_border',
    name: 'Journeyman Silver Border',
    unlockedByDefault: false,
    requiredAchievementId: 'rank_journeyman',
    value: 'silver-card-border',
    previewClass: 'silver-card-border rounded-lg p-1',
  },
  {
    id: 'gold_border',
    name: 'Guildmaster Gold Border',
    unlockedByDefault: false,
    requiredAchievementId: 'rank_guildmaster',
    value: 'gold-card-border',
    previewClass: 'gold-card-border rounded-lg p-1',
  },
  {
    id: 'void_border',
    name: 'Rotating Void Border',
    unlockedByDefault: false,
    requiredAchievementId: 'first_gm_session',
    value: 'rounded-lg void-rotating-border',
    previewClass: 'void-rotating-border rounded-lg p-1',
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
  {
    id: 'silver_ring',
    name: 'Journeyman Silver Ring',
    unlockedByDefault: false,
    requiredAchievementId: 'rank_journeyman',
    value: 'silver-avatar-ring',
    previewClass: 'silver-avatar-ring',
  },
  {
    id: 'gold_ring',
    name: 'Guildmaster Gold Ring',
    unlockedByDefault: false,
    requiredAchievementId: 'rank_guildmaster',
    value: 'gold-avatar-ring',
    previewClass: 'gold-avatar-ring',
  },
  {
    id: 'void_ring',
    name: 'Rotating Void Ring',
    unlockedByDefault: false,
    requiredAchievementId: 'veteran_gm_5',
    value: 'void-avatar-ring',
    previewClass: 'void-avatar-ring',
  },
  {
    id: 'leaderboard_rank',
    name: 'Leaderboard Rank Badge',
    unlockedByDefault: false,
    requiredAchievementId: 'visit_leaderboard',
    value: 'leaderboard-rank-badge',
    previewClass: 'leaderboard-rank-badge',
  },
  {
    id: 'comm_roleplay',
    name: 'Roleplay Badge (🎭)',
    unlockedByDefault: false,
    requiredAchievementId: 'comm_roleplay',
    value: 'comm-roleplay-badge',
  },
  {
    id: 'comm_tactics',
    name: 'Tactics Badge (⚔️)',
    unlockedByDefault: false,
    requiredAchievementId: 'comm_tactics',
    value: 'comm-tactics-badge',
  },
  {
    id: 'comm_clutch',
    name: 'Clutch Badge (🛡️)',
    unlockedByDefault: false,
    requiredAchievementId: 'comm_clutch',
    value: 'comm-clutch-badge',
  },
  {
    id: 'comm_heroic',
    name: 'Heroic Badge (🌟)',
    unlockedByDefault: false,
    requiredAchievementId: 'comm_heroic',
    value: 'comm-heroic-badge',
  },
  {
    id: 'gm_favor',
    name: 'GM Favor Badge (👑)',
    unlockedByDefault: false,
    requiredAchievementId: 'gm_favor',
    value: 'comm-gm-badge',
  },
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
  {
    id: 'silver_tint',
    name: 'Journeyman Silver Tint',
    unlockedByDefault: false,
    requiredAchievementId: 'rank_journeyman',
    value: 'silver-bg-tint',
  },
  {
    id: 'gold_tint',
    name: 'Guildmaster Gold Tint',
    unlockedByDefault: false,
    requiredAchievementId: 'rank_guildmaster',
    value: 'gold-bg-tint',
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
  const profileObj = PROFILE_BORDER_OPTIONS.find((p) => p.id === cosmetics.profileBorder || p.value === cosmetics.profileBorder)
  const profileRingClassName = profileObj ? profileObj.value : 'border border-border'

  // Card Background
  const bgObj = BG_COLOR_OPTIONS.find((b) => b.id === cosmetics.bgColor || b.value === cosmetics.bgColor)
  let cardBgStyle: React.CSSProperties = {}
  const isMetallicBorder = cardClassName.includes('gold-card-border') || cardClassName.includes('silver-card-border')

  if (bgObj?.value === 'gold-bg-tint' || cosmetics.bgColor === 'gold_tint' || cosmetics.bgColor === 'gold-bg-tint') {
    if (isMetallicBorder) {
      const goldPaddingLayer =
        'linear-gradient(135deg, rgba(191,149,63,0.18) 0%, rgba(252,246,186,0.12) 50%, rgba(170,119,28,0.18) 100%), linear-gradient(var(--card), var(--card))'
      cardBgStyle = { '--card-bg': goldPaddingLayer } as React.CSSProperties
    } else {
      cardClassName = cardClassName ? `${cardClassName} gold-bg-tint` : 'gold-bg-tint'
    }
  } else if (bgObj?.value === 'silver-bg-tint' || cosmetics.bgColor === 'silver_tint' || cosmetics.bgColor === 'silver-bg-tint') {
    if (isMetallicBorder) {
      const silverPaddingLayer =
        'linear-gradient(135deg, rgba(148,163,184,0.18) 0%, rgba(241,245,249,0.14) 50%, rgba(71,85,105,0.18) 100%), linear-gradient(var(--card), var(--card))'
      cardBgStyle = { '--card-bg': silverPaddingLayer } as React.CSSProperties
    } else {
      cardClassName = cardClassName ? `${cardClassName} silver-bg-tint` : 'silver-bg-tint'
    }
  } else if (bgObj && bgObj.value) {
    if (isMetallicBorder) {
      const tintPaddingLayer = `linear-gradient(${bgObj.value}, ${bgObj.value}), linear-gradient(var(--card), var(--card))`
      cardBgStyle = { '--card-bg': tintPaddingLayer } as React.CSSProperties
    } else {
      cardBgStyle = { backgroundColor: bgObj.value }
    }
  } else if (cosmetics.bgColor) {
    if (isMetallicBorder) {
      const tintPaddingLayer = `linear-gradient(${cosmetics.bgColor}, ${cosmetics.bgColor}), linear-gradient(var(--card), var(--card))`
      cardBgStyle = { '--card-bg': tintPaddingLayer } as React.CSSProperties
    } else {
      cardBgStyle = { backgroundColor: cosmetics.bgColor }
    }
  }

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

  if (colorObj?.value === 'gold-text' || cosmetics.nameColor === 'gold_text' || cosmetics.nameColor === 'gold-text') {
    nameClassName = nameClassName ? `${nameClassName} gold-text font-extrabold` : 'gold-text font-extrabold'
    nameStyle = {}
  } else if (colorObj?.value === 'rainbow-text' || cosmetics.nameColor === 'rainbow' || cosmetics.nameColor === 'rainbow-text') {
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

  if (subColorObj?.value === 'gold-text' || cosmetics.subtitleColor === 'gold_text' || cosmetics.subtitleColor === 'gold-text') {
    subtitleClassName = `${subtitleClassName} gold-text`
    subtitleStyle = {}
  } else if (subColorObj?.value === 'rainbow-text' || cosmetics.subtitleColor === 'rainbow' || cosmetics.subtitleColor === 'rainbow-text') {
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
