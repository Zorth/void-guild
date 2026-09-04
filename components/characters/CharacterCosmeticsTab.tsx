'use client'

import React from 'react'
import {
  Sparkles,
  Lock,
  Palette,
  Type,
  Frame,
  Paintbrush,
  Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { getLevelBadgeStyle, CharacterRankIcon, cn } from '@/lib/utils'
import ProfileAvatarWithBadge from '@/components/characters/ProfileAvatarWithBadge'
import {
  resolveCosmeticsStyles,
  FONT_OPTIONS,
  COLOR_OPTIONS,
  BORDER_SHAPE_OPTIONS,
  PROFILE_BORDER_OPTIONS,
  BG_COLOR_OPTIONS,
  CharacterCosmetics,
  CosmeticOption,
  ACHIEVEMENT_INFO,
} from '@/lib/cosmetics'

interface CharacterCosmeticsTabProps {
  characterId?: string
  characterName: string
  ancestry: string
  characterClass: string
  characterLvl: number
  characterRank?: string
  cosmetics: CharacterCosmetics
  onChangeCosmetics: (updater: (prev: CharacterCosmetics) => CharacterCosmetics) => void
  unlockedAchievementIds: string[]
  isAdmin?: boolean
}

export default function CharacterCosmeticsTab({
  characterId,
  characterName,
  ancestry,
  characterClass,
  characterLvl,
  characterRank,
  cosmetics,
  onChangeCosmetics,
  unlockedAchievementIds,
  isAdmin = false,
}: CharacterCosmeticsTabProps) {
  const { user } = useUser()
  const profileImageUrl = user?.imageUrl
  const characterRanks = useQuery(api.characters.getCharacterLeaderboardRanks)
  const rankNumber = (characterId ? characterRanks?.[characterId] : undefined) ?? 1

  function getOptionLockStatus(opt: CosmeticOption) {
    if (opt.unlockedByDefault) return { isUnlocked: true, label: '', badgeLabel: '', isHidden: false, title: '' }
    if (!opt.requiredAchievementId) return { isUnlocked: true, label: '', badgeLabel: '', isHidden: false, title: '' }
    const isUnlocked = unlockedAchievementIds.includes(opt.requiredAchievementId)
    const info = ACHIEVEMENT_INFO[opt.requiredAchievementId]
    const isHidden = info?.category === 'hidden'
    const title = info?.title || opt.requiredAchievementId
    const label = isUnlocked
      ? ''
      : isHidden
        ? 'Locked (Secret Achievement)'
        : `Requires achievement: ${title}`
    const badgeLabel = isUnlocked
      ? ''
      : isHidden
        ? 'Locked'
        : `Requires: ${title}`

    return { isUnlocked, isHidden, label, badgeLabel, title }
  }

  function isOptionVisible(opt: CosmeticOption) {
    const { isUnlocked, isHidden } = getOptionLockStatus(opt)
    if (isUnlocked) return true
    if (isHidden && !isAdmin) return false
    return true
  }

  function handleSelectOption(category: keyof CharacterCosmetics, opt: CosmeticOption) {
    const { isUnlocked, isHidden, title } = getOptionLockStatus(opt)
    if (!isUnlocked) {
      if (isHidden) {
        toast.error('Locked cosmetic! Unlocked by a secret achievement.')
      } else {
        toast.error(`Locked cosmetic! Requires achievement: "${title}"`)
      }
      return
    }
    onChangeCosmetics((prev) => ({
      ...prev,
      [category]: opt.id,
    }))
  }

  const renderColorSwatches = (colorKey: 'nameColor' | 'subtitleColor') => {
    const isDefaultSelected = !cosmetics[colorKey] || cosmetics[colorKey] === ''
    const defaultFillClass = colorKey === 'nameColor' ? 'bg-foreground' : 'bg-muted-foreground'

    return (
      <div className="flex flex-wrap gap-2.5 items-center">
        {/* Default Theme Color Swatch */}
        <button
          type="button"
          onClick={() => onChangeCosmetics((prev) => ({ ...prev, [colorKey]: '' }))}
          title="Default Theme Color"
          className={cn(
            'w-8 h-8 rounded-full border transition-all relative shadow-sm',
            defaultFillClass,
            isDefaultSelected
              ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background scale-110 border-purple-500'
              : 'border-transparent hover:scale-105 opacity-80'
          )}
        />

        {/* Preset Color Swatches */}
        {COLOR_OPTIONS.filter((c) => c.id !== 'default' && isOptionVisible(c)).map((opt) => {
          const { isUnlocked, label } = getOptionLockStatus(opt)
          const isSelected = cosmetics[colorKey] === opt.value || cosmetics[colorKey] === opt.id
          const isRainbowOpt = opt.value === 'rainbow-text' || opt.id === 'rainbow'
          const isGoldOpt = opt.value === 'gold-text' || opt.id === 'gold_text'

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectOption(colorKey, opt)}
              title={!isUnlocked ? label : opt.name}
              className={cn(
                'w-8 h-8 rounded-full transition-all flex items-center justify-center relative border overflow-hidden shrink-0',
                isRainbowOpt && 'bg-gradient-to-r from-red-500 via-green-500 to-purple-500',
                isGoldOpt && 'bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#AA771C]',
                isSelected
                  ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background scale-110 border-white dark:border-slate-900'
                  : isUnlocked
                    ? 'border-transparent hover:scale-105 shadow-sm'
                    : 'opacity-40 grayscale cursor-not-allowed border-border/40'
              )}
              style={!isRainbowOpt && !isGoldOpt ? { backgroundColor: opt.value } : {}}
            >
              {isRainbowOpt && (
                <span className="text-[9px] font-black text-white drop-shadow tracking-tighter">
                  RGB
                </span>
              )}
              {isGoldOpt && (
                <span className="text-[9px] font-black text-amber-950 drop-shadow-sm tracking-tighter">
                  AU
                </span>
              )}
              {!isUnlocked && <Lock className="h-3 w-3 text-white drop-shadow z-10" />}
            </button>
          )
        })}
      </div>
    )
  }

  const previewStyles = resolveCosmeticsStyles(cosmetics)

  return (
    <div className="flex flex-col gap-6">
      {/* Live Calling Card Preview */}
      <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border/70 space-y-2">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            Calling Card Live Preview
          </span>
          <span className="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
            Attending List Style
          </span>
        </div>

        <div
          className={cn(
            'p-3 rounded-lg flex items-center justify-between gap-3 border transition-all',
            previewStyles.cardClassName
          )}
          style={previewStyles.cardStyle}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ProfileAvatarWithBadge
              imageUrl={profileImageUrl}
              name={characterName}
              cosmetics={cosmetics}
              profileRingClassName={previewStyles.profileRingClassName}
              rankNumber={rankNumber}
              size="lg"
            />
            <div className="min-w-0">
              <div className="font-bold flex items-center gap-2">
                <span className={cn('break-words', previewStyles.nameClassName)} style={previewStyles.nameStyle}>
                  {characterName || 'Character Name'}
                </span>
                <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">
                  You
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                <span className={previewStyles.subtitleClassName} style={previewStyles.subtitleStyle}>
                  {ancestry || 'Ancestry'} {characterClass || 'Class'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <CharacterRankIcon rank={characterRank} />
            <span
              className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
              style={getLevelBadgeStyle(characterLvl)}
            >
              Lvl {characterLvl}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Name Font */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold flex items-center gap-1.5">
          <Type className="h-4 w-4 text-purple-500" />
          Name Font
        </label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
          value={cosmetics.nameFont || 'default'}
          onChange={(e) => {
            const opt = FONT_OPTIONS.find((f) => f.id === e.target.value)
            if (opt) handleSelectOption('nameFont', opt)
          }}
        >
          {FONT_OPTIONS.filter(isOptionVisible).map((f) => {
            const { isUnlocked, isHidden, title } = getOptionLockStatus(f)
            return (
              <option key={f.id} value={f.id} disabled={!isUnlocked}>
                {isUnlocked
                  ? f.name
                  : isHidden
                    ? `🔒 ${f.name} (Secret Achievement)`
                    : `🔒 ${f.name} (Requires: ${title})`}
              </option>
            )
          })}
        </select>
      </div>

      {/* 2. Subtitle Font */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold flex items-center gap-1.5">
          <Type className="h-4 w-4 text-purple-400" />
          Subtitle Font
        </label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
          value={cosmetics.subtitleFont || 'default'}
          onChange={(e) => {
            const opt = FONT_OPTIONS.find((f) => f.id === e.target.value)
            if (opt) handleSelectOption('subtitleFont', opt)
          }}
        >
          {FONT_OPTIONS.filter(isOptionVisible).map((f) => {
            const { isUnlocked, isHidden, title } = getOptionLockStatus(f)
            return (
              <option key={f.id} value={f.id} disabled={!isUnlocked}>
                {isUnlocked
                  ? f.name
                  : isHidden
                    ? `🔒 ${f.name} (Secret Achievement)`
                    : `🔒 ${f.name} (Requires: ${title})`}
              </option>
            )
          })}
        </select>
      </div>

      {/* 3. Name Color Swatches */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold flex items-center gap-1.5">
          <Palette className="h-4 w-4 text-purple-500" />
          Name Color
        </label>
        {renderColorSwatches('nameColor')}
      </div>

      {/* 4. Subtitle Color Swatches */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold flex items-center gap-1.5">
          <Palette className="h-4 w-4 text-purple-400" />
          Subtitle Color
        </label>
        {renderColorSwatches('subtitleColor')}
      </div>

      {/* 5. Card Border Effect & Shape */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold flex items-center gap-1.5">
          <Frame className="h-4 w-4 text-amber-500" />
          Card Border Effect & Shape
        </label>
        <div className="flex flex-col gap-2">
          {BORDER_SHAPE_OPTIONS.filter(isOptionVisible).map((opt) => {
            const { isUnlocked, label, badgeLabel } = getOptionLockStatus(opt)
            const isSelected = cosmetics.borderShape === opt.id || cosmetics.borderShape === opt.value

            return (
              <button
                key={opt.id}
                type="button"
                data-selected={isSelected}
                onClick={() => handleSelectOption('borderShape', opt)}
                title={!isUnlocked ? label : opt.name}
                className={cn(
                  'w-full p-3 text-left text-xs transition-all flex items-center justify-between',
                  opt.value,
                  isSelected
                    ? 'bg-purple-500/25 dark:bg-purple-950/50 font-bold text-foreground'
                    : isUnlocked
                      ? 'bg-card/80 hover:bg-muted/40 text-foreground'
                      : 'bg-muted/20 text-muted-foreground opacity-50 grayscale cursor-not-allowed'
                )}
              >
                <span className="font-semibold">{opt.name}</span>
                {!isUnlocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                    <Lock className="h-3 w-3" />
                    {badgeLabel}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 6. Card Background Color / Tint */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold flex items-center gap-1.5">
          <Paintbrush className="h-4 w-4 text-blue-500" />
          Card Background Tint
        </label>
        <div className="flex flex-col gap-2">
          {BG_COLOR_OPTIONS.filter(isOptionVisible).map((opt) => {
            const { isUnlocked, label, badgeLabel } = getOptionLockStatus(opt)
            const isSelected =
              cosmetics.bgColor === opt.id ||
              cosmetics.bgColor === opt.value ||
              (opt.id === 'default' && (!cosmetics.bgColor || cosmetics.bgColor === 'default'))

            const isGoldTint = opt.value === 'gold-bg-tint'

            return (
              <button
                key={opt.id}
                type="button"
                data-selected={isSelected}
                onClick={() => handleSelectOption('bgColor', opt)}
                title={!isUnlocked ? label : opt.name}
                className={cn(
                  'w-full p-3 rounded-lg text-left text-xs transition-all flex items-center justify-between border',
                  isGoldTint && 'gold-bg-tint',
                  isSelected
                    ? 'border-2 border-purple-500 ring-2 ring-purple-500 font-bold text-foreground'
                    : isUnlocked
                      ? 'border-border hover:border-muted-foreground text-foreground'
                      : 'border-border/40 opacity-50 grayscale cursor-not-allowed'
                )}
                style={{
                  backgroundColor: !isGoldTint && opt.value ? opt.value : undefined,
                }}
              >
                <span className="font-semibold">{opt.name}</span>
                {!isUnlocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                    <Lock className="h-3 w-3" />
                    {badgeLabel}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 7. Profile Avatar Ring */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold flex items-center gap-1.5">
          <Circle className="h-4 w-4 text-emerald-500" />
          Profile Avatar Ring
        </label>
        <div className="flex flex-wrap gap-2.5 items-center">
          {PROFILE_BORDER_OPTIONS.filter(isOptionVisible).map((opt) => {
            const { isUnlocked, label } = getOptionLockStatus(opt)
            const isSelected =
              cosmetics.profileBorder === opt.id ||
              (opt.id === 'default' && (!cosmetics.profileBorder || cosmetics.profileBorder === 'default'))

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption('profileBorder', opt)}
                title={!isUnlocked ? label : opt.name}
                className={cn(
                  'p-2 rounded-xl border transition-all flex items-center justify-center relative shrink-0',
                  isSelected
                    ? 'bg-purple-500/25 dark:bg-purple-950/50 border-purple-500/60 shadow-sm'
                    : isUnlocked
                      ? 'border-transparent hover:bg-muted/40'
                      : 'border-transparent opacity-40 grayscale cursor-not-allowed'
                )}
              >
                <ProfileAvatarWithBadge
                  imageUrl={profileImageUrl}
                  name={characterName}
                  cosmetics={{ profileBorder: opt.id }}
                  profileRingClassName={opt.value}
                  rankNumber={rankNumber}
                  size="lg"
                />
                {!isUnlocked && <Lock className="h-4 w-4 text-white drop-shadow absolute z-10" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
