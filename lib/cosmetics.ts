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
  veteran_player_5: { title: 'Seasoned Adventurer', category: 'hidden' },
  master_player_10: { title: 'Guild Champion', category: 'hidden' },
  first_gm_session: { title: 'Behind the Screen', category: 'normal' },
  veteran_gm_5: { title: 'Master Storyteller', category: 'hidden' },
  level_5_char: { title: 'Rising Power', category: 'normal' },
  level_10_char: { title: 'Legendary Hero', category: 'hidden' },
  first_commendation: { title: 'Party Favorite', category: 'hidden' },
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
  comm_jack_of_all_trades: { title: 'Jack of All Trades', category: 'hidden' },
  character_streak_3: { title: 'In Sync', category: 'hidden' },
  character_streak_5: { title: 'Unbreakable Bond', category: 'hidden' },
  character_streak_10: { title: 'Inseparable Adventurers', category: 'hidden' },
  system_polymath: { title: 'System Polymath', category: 'hidden' },
  loot_first: { title: 'Treasure Seeker', category: 'normal' },
  loot_hoarder_5: { title: 'Hoarder', category: 'hidden' },
  visit_world: { title: 'World Explorer', category: 'normal' },
  visit_wiki: { title: 'Scholar of the Void', category: 'hidden' },
  give_1_commendation: { title: 'Generous Spirit', category: 'normal' },
  give_5_commendations: { title: 'Patron of Valor', category: 'hidden' },
  give_10_commendations: { title: 'Guild Encourager', category: 'hidden' },
  worlds_played_3: { title: 'Dimensional Traveler', category: 'hidden' },
  worlds_played_5: { title: 'Multiverse Wanderer', category: 'hidden' },
  express_interest: { title: 'Eager Adventurer', category: 'normal' },
  availability_5_days: { title: 'Duty Calls', category: 'normal' },
  void_objective_contribution: { title: 'Void Incursion Defender', category: 'hidden' },
  black_void_auction_listing: { title: 'Black Market Auctioneer', category: 'hidden' },
  black_void_service_listing: { title: 'Services for Hire', category: 'hidden' },
  create_character_quest: { title: 'Quest Benefactor', category: 'hidden' },
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
  {
    id: 'rounded_sans',
    name: 'Friendly Rounded',
    unlockedByDefault: false,
    requiredAchievementId: 'link_discord',
    value: 'font-rounded',
  },
  {
    id: 'cinzel_decorative',
    name: 'Cinzel Decorative',
    unlockedByDefault: false,
    requiredAchievementId: 'system_polymath',
    value: 'font-cinzel-dec',
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
    id: 'tangerine_text',
    name: 'Tangerine Accent',
    unlockedByDefault: false,
    requiredAchievementId: 'express_interest',
    value: '#FB923C',
  },
  {
    id: 'emerald_text',
    name: 'Emerald Accent',
    unlockedByDefault: false,
    requiredAchievementId: 'availability_5_days',
    value: '#34D399',
  },
  {
    id: 'sky_blue_text',
    name: 'Sky Blue Accent',
    unlockedByDefault: false,
    requiredAchievementId: 'visit_world',
    value: '#38BDF8',
  },
  {
    id: 'amber_text',
    name: 'Warm Amber Accent',
    unlockedByDefault: false,
    requiredAchievementId: 'first_commendation',
    value: '#FBBF24',
  },
  {
    id: 'ruby_text',
    name: 'Ruby Red Accent',
    unlockedByDefault: false,
    requiredAchievementId: 'loot_hoarder_5',
    value: '#EF4444',
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
  {
    id: 'blaze_text',
    name: 'Blazing Fire Gradient Text',
    unlockedByDefault: false,
    requiredAchievementId: 'character_streak_5',
    value: 'blaze-fire-text',
    previewClass: 'blaze-fire-text font-extrabold',
  },
]

export const BORDER_SHAPE_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Solid', unlockedByDefault: true, value: 'rounded-lg border border-border' },
  {
    id: 'bronze_border',
    name: 'Treasure Seeker Bronze Border',
    unlockedByDefault: false,
    requiredAchievementId: 'loot_first',
    value: 'bronze-card-border',
    previewClass: 'bronze-card-border rounded-lg p-1',
  },
  {
    id: 'purple_border',
    name: 'Purple Highlight Border',
    unlockedByDefault: false,
    requiredAchievementId: 'tutorial_completed',
    value: 'purple-card-border',
    previewClass: 'purple-card-border rounded-lg p-1',
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
  {
    id: 'in_sync_border',
    name: 'Resonant Blaze Border',
    unlockedByDefault: false,
    requiredAchievementId: 'character_streak_3',
    value: 'rounded-lg in-sync-card-border',
    previewClass: 'in-sync-card-border rounded-lg p-1',
  },
]

export const PROFILE_BORDER_OPTIONS: CosmeticOption[] = [
  { id: 'default', name: 'Default Ring', unlockedByDefault: true, value: 'border border-border' },
  {
    id: 'sprout_ring',
    name: 'Newbie Sprout Ring 🌱',
    unlockedByDefault: false,
    requiredAchievementId: 'first_character',
    value: 'sprout-avatar-ring',
    previewClass: 'sprout-avatar-ring',
  },
  {
    id: 'compass_ring',
    name: 'Compass Rose Ring 🧭',
    unlockedByDefault: false,
    requiredAchievementId: 'worlds_played_3',
    value: 'compass-avatar-ring',
    previewClass: 'compass-avatar-ring',
  },
  {
    id: 'multiverse_compass_ring',
    name: 'Multiverse Astrolabe Ring 🌌',
    unlockedByDefault: false,
    requiredAchievementId: 'worlds_played_5',
    value: 'multiverse-compass-avatar-ring',
    previewClass: 'multiverse-compass-avatar-ring',
  },
  {
    id: 'laurel_spirit_ring',
    name: 'Silver Laurel Twig Ring 🌿',
    unlockedByDefault: false,
    requiredAchievementId: 'give_1_commendation',
    value: 'laurel-spirit-avatar-ring',
    previewClass: 'laurel-spirit-avatar-ring',
  },
  {
    id: 'laurel_patron_ring',
    name: 'Silver Laurel Circlet Ring 🌿',
    unlockedByDefault: false,
    requiredAchievementId: 'give_5_commendations',
    value: 'laurel-patron-avatar-ring',
    previewClass: 'laurel-patron-avatar-ring',
  },
  {
    id: 'laurel_ring',
    name: 'Grand Silver Laurel Wreath Ring 🌿',
    unlockedByDefault: false,
    requiredAchievementId: 'give_10_commendations',
    value: 'laurel-avatar-ring',
    previewClass: 'laurel-avatar-ring',
  },
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
    id: 'jack_of_all_trades',
    name: 'Red Wax Seal & Ribbon',
    unlockedByDefault: false,
    requiredAchievementId: 'comm_jack_of_all_trades',
    value: 'jack-seal-ring',
    previewClass: 'jack-seal-ring',
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
    id: 'parchment_bg',
    name: 'Ancient Parchment Tint',
    unlockedByDefault: false,
    requiredAchievementId: 'visit_wiki',
    value: 'parchment-bg-tint',
  },
  {
    id: 'purple_tint',
    name: 'Purple Tint',
    unlockedByDefault: false,
    requiredAchievementId: 'tutorial_completed',
    value: 'rgba(147, 51, 234, 0.15)',
  },
  {
    id: 'cyan_particles',
    name: 'Cyan Particle Tint (Lvl 5)',
    unlockedByDefault: false,
    requiredAchievementId: 'level_5_char',
    value: 'cyan-particle-bg',
  },
  {
    id: 'crimson_particles',
    name: 'Crimson Flame Particle Tint (Lvl 10)',
    unlockedByDefault: false,
    requiredAchievementId: 'level_10_char',
    value: 'crimson-particle-bg',
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
  {
    id: 'void_nebula',
    name: 'Moving Void Nebula Tint',
    unlockedByDefault: false,
    requiredAchievementId: 'void_objective_contribution',
    value: 'void-nebula-bg',
  },
  {
    id: 'blaze_inferno_bg',
    name: 'Living Inferno Fire Tint',
    unlockedByDefault: false,
    requiredAchievementId: 'character_streak_10',
    value: 'blaze-inferno-bg',
  },
]

export interface CharacterCosmetics {
  nameFont?: string
  titleFont?: string
  subtitleFont?: string
  nameColor?: string
  titleColor?: string
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
      titleClassName: 'text-xs text-amber-400/90 italic font-medium',
      titleStyle: {},
      subtitleClassName: 'font-normal opacity-80',
      subtitleStyle: { opacity: 0.8 },
      profileRingClassName: 'border border-border',
    }
  }

  // Name Font
  const nameFontObj = FONT_OPTIONS.find((f) => f.id === cosmetics.nameFont)
  const nameFontVal = nameFontObj ? nameFontObj.value : ''

  // Title Font
  const titleFontObj = FONT_OPTIONS.find((f) => f.id === cosmetics.titleFont)
  const titleFontVal = titleFontObj ? titleFontObj.value : ''

  // Subtitle Font
  const subFontObj = FONT_OPTIONS.find((f) => f.id === cosmetics.subtitleFont)
  const subFontVal = subFontObj ? subFontObj.value : ''

  // Border Shape
  const shapeObj = BORDER_SHAPE_OPTIONS.find(
    (s) =>
      s.id === cosmetics.borderShape ||
      s.value === cosmetics.borderShape ||
      (s.id === 'purple_border' && cosmetics.borderShape?.includes('#D8B4FE'))
  )
  let cardClassName = shapeObj ? shapeObj.value : ''

  // Profile Border
  const profileObj = PROFILE_BORDER_OPTIONS.find((p) => p.id === cosmetics.profileBorder || p.value === cosmetics.profileBorder)
  const profileRingClassName = profileObj ? profileObj.value : 'border border-border'

  // Card Background
  const bgObj = BG_COLOR_OPTIONS.find((b) => b.id === cosmetics.bgColor || b.value === cosmetics.bgColor)
  let cardBgStyle: React.CSSProperties = {}
  const isGradientBorder =
    cardClassName.includes('gold-card-border') ||
    cardClassName.includes('silver-card-border') ||
    cardClassName.includes('bronze-card-border') ||
    cardClassName.includes('purple-card-border') ||
    cardClassName.includes('in-sync-card-border')

  if (bgObj?.value === 'gold-bg-tint' || cosmetics.bgColor === 'gold_tint' || cosmetics.bgColor === 'gold-bg-tint') {
    if (isGradientBorder) {
      const goldPaddingLayer =
        'linear-gradient(135deg, rgba(191,149,63,0.18) 0%, rgba(252,246,186,0.12) 50%, rgba(170,119,28,0.18) 100%), linear-gradient(var(--card), var(--card))'
      cardBgStyle = { '--card-bg': goldPaddingLayer } as React.CSSProperties
    } else {
      cardClassName = cardClassName ? `${cardClassName} gold-bg-tint` : 'gold-bg-tint'
    }
  } else if (bgObj?.value === 'silver-bg-tint' || cosmetics.bgColor === 'silver_tint' || cosmetics.bgColor === 'silver-bg-tint') {
    if (isGradientBorder) {
      const silverPaddingLayer =
        'linear-gradient(135deg, rgba(148,163,184,0.18) 0%, rgba(241,245,249,0.14) 50%, rgba(71,85,105,0.18) 100%), linear-gradient(var(--card), var(--card))'
      cardBgStyle = { '--card-bg': silverPaddingLayer } as React.CSSProperties
    } else {
      cardClassName = cardClassName ? `${cardClassName} silver-bg-tint` : 'silver-bg-tint'
    }
  } else if (bgObj?.value === 'cyan-particle-bg' || cosmetics.bgColor === 'cyan_particles' || cosmetics.bgColor === 'cyan-particle-bg') {
    if (isGradientBorder) {
      const cyanPaddingLayer =
        'radial-gradient(circle at 50% 20%, rgba(6, 182, 212, 0.22) 0%, rgba(8, 145, 178, 0.08) 50%, transparent 100%), linear-gradient(var(--card), var(--card))'
      cardBgStyle = { '--card-bg': cyanPaddingLayer } as React.CSSProperties
    } else {
      cardClassName = cardClassName ? `${cardClassName} cyan-particle-bg` : 'cyan-particle-bg'
    }
  } else if (bgObj?.value === 'crimson-particle-bg' || cosmetics.bgColor === 'crimson_particles' || cosmetics.bgColor === 'crimson-particle-bg') {
    if (isGradientBorder) {
      const crimsonPaddingLayer =
        'radial-gradient(circle at 50% 20%, rgba(220, 38, 38, 0.25) 0%, rgba(153, 27, 27, 0.1) 50%, transparent 100%), linear-gradient(var(--card), var(--card))'
      cardBgStyle = { '--card-bg': crimsonPaddingLayer } as React.CSSProperties
    } else {
      cardClassName = cardClassName ? `${cardClassName} crimson-particle-bg` : 'crimson-particle-bg'
    }
  } else if (bgObj?.value === 'parchment-bg-tint' || cosmetics.bgColor === 'parchment_bg' || cosmetics.bgColor === 'parchment-bg-tint') {
    if (isGradientBorder) {
      const parchmentPaddingLayer =
        'radial-gradient(circle at 50% 30%, rgba(217, 180, 130, 0.22) 0%, rgba(160, 120, 70, 0.1) 60%, transparent 100%), linear-gradient(var(--card), var(--card))'
      cardBgStyle = { '--card-bg': parchmentPaddingLayer } as React.CSSProperties
    } else {
      cardClassName = cardClassName ? `${cardClassName} parchment-bg-tint` : 'parchment-bg-tint'
    }
  } else if (bgObj?.value === 'void-nebula-bg' || cosmetics.bgColor === 'void_nebula' || cosmetics.bgColor === 'void-nebula-bg') {
    if (isGradientBorder) {
      const voidPaddingLayer =
        'radial-gradient(ellipse at 25% 25%, rgba(168, 85, 247, 0.28) 0%, transparent 55%), radial-gradient(ellipse at 75% 75%, rgba(147, 51, 234, 0.24) 0%, transparent 55%), linear-gradient(var(--card), var(--card))'
      cardBgStyle = { '--card-bg': voidPaddingLayer } as React.CSSProperties
      cardClassName = cardClassName ? `${cardClassName} void-nebula-bg` : 'void-nebula-bg'
    } else {
      cardClassName = cardClassName ? `${cardClassName} void-nebula-bg` : 'void-nebula-bg'
    }
  } else if (bgObj?.value === 'blaze-inferno-bg' || cosmetics.bgColor === 'blaze_inferno_bg' || cosmetics.bgColor === 'blaze-inferno-bg') {
    if (isGradientBorder) {
      const firePaddingLayer =
        'radial-gradient(ellipse at 50% 100%, rgba(234, 88, 12, 0.35) 0%, rgba(185, 28, 28, 0.2) 50%, transparent 80%), linear-gradient(var(--card), var(--card))'
      cardBgStyle = { '--card-bg': firePaddingLayer } as React.CSSProperties
      cardClassName = cardClassName ? `${cardClassName} blaze-inferno-bg` : 'blaze-inferno-bg'
    } else {
      cardClassName = cardClassName ? `${cardClassName} blaze-inferno-bg` : 'blaze-inferno-bg'
    }
  } else if (bgObj && bgObj.value) {
    if (isGradientBorder) {
      const tintPaddingLayer = `linear-gradient(${bgObj.value}, ${bgObj.value}), linear-gradient(var(--card), var(--card))`
      cardBgStyle = { '--card-bg': tintPaddingLayer } as React.CSSProperties
    } else {
      cardBgStyle = { backgroundColor: bgObj.value }
    }
  } else if (cosmetics.bgColor) {
    if (isGradientBorder) {
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
  } else if (colorObj?.value === 'blaze-fire-text' || cosmetics.nameColor === 'blaze_text' || cosmetics.nameColor === 'blaze-fire-text') {
    nameClassName = nameClassName ? `${nameClassName} blaze-fire-text font-extrabold` : 'blaze-fire-text font-extrabold'
    nameStyle = {}
  } else if (colorObj?.value) {
    nameStyle = { color: colorObj.value }
  } else if (cosmetics.nameColor) {
    nameStyle = { color: cosmetics.nameColor }
  }

  // Title Style & Class (Default is amber-400/90 italic font-medium)
  const titleColorObj = COLOR_OPTIONS.find((c) => c.id === cosmetics.titleColor || c.value === cosmetics.titleColor)
  let titleClassName = titleFontVal
    ? `${titleFontVal} text-xs italic font-medium`
    : 'text-xs italic font-medium'
  let titleStyle: React.CSSProperties = {}

  if (titleColorObj?.value === 'gold-text' || cosmetics.titleColor === 'gold_text' || cosmetics.titleColor === 'gold-text') {
    titleClassName = `${titleClassName} gold-text`
    titleStyle = {}
  } else if (titleColorObj?.value === 'rainbow-text' || cosmetics.titleColor === 'rainbow' || cosmetics.titleColor === 'rainbow-text') {
    titleClassName = `${titleClassName} rainbow-text`
    titleStyle = {}
  } else if (titleColorObj?.value === 'blaze-fire-text' || cosmetics.titleColor === 'blaze_text' || cosmetics.titleColor === 'blaze-fire-text') {
    titleClassName = `${titleClassName} blaze-fire-text font-bold`
    titleStyle = {}
  } else if (titleColorObj && titleColorObj.id !== 'default' && titleColorObj.value) {
    titleStyle = { color: titleColorObj.value }
  } else if (cosmetics.titleColor && cosmetics.titleColor !== 'default') {
    titleStyle = { color: cosmetics.titleColor }
  } else {
    // Default title color
    titleClassName = `${titleClassName} text-amber-400/90`
  }

  // Subtitle Style & Class (Always translucent with opacity 0.8 by default)
  const subColorObj = COLOR_OPTIONS.find((c) => c.id === cosmetics.subtitleColor || c.value === cosmetics.subtitleColor)
  let subtitleClassName = subFontVal
    ? `${subFontVal} font-normal opacity-80`
    : 'font-normal opacity-80'
  let subtitleStyle: React.CSSProperties = { opacity: 0.8 }

  if (subColorObj?.value === 'gold-text' || cosmetics.subtitleColor === 'gold_text' || cosmetics.subtitleColor === 'gold-text') {
    subtitleClassName = `${subtitleClassName} gold-text`
    subtitleStyle = {}
  } else if (subColorObj?.value === 'rainbow-text' || cosmetics.subtitleColor === 'rainbow' || cosmetics.subtitleColor === 'rainbow-text') {
    subtitleClassName = `${subtitleClassName} rainbow-text`
    subtitleStyle = {}
  } else if (subColorObj?.value === 'blaze-fire-text' || cosmetics.subtitleColor === 'blaze_text' || cosmetics.subtitleColor === 'blaze-fire-text') {
    subtitleClassName = `${subtitleClassName} blaze-fire-text font-semibold`
    subtitleStyle = {}
  } else if (subColorObj && subColorObj.id !== 'default' && subColorObj.value) {
    subtitleStyle = { color: subColorObj.value, opacity: 0.8 }
  } else if (cosmetics.subtitleColor && cosmetics.subtitleColor !== 'default') {
    subtitleStyle = { color: cosmetics.subtitleColor, opacity: 0.8 }
  }

  return {
    cardClassName,
    cardStyle,
    nameClassName,
    nameStyle,
    titleClassName,
    titleStyle,
    subtitleClassName,
    subtitleStyle,
    profileRingClassName,
  }
}
