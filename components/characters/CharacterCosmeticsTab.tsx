'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  Lock,
  Palette,
  Type,
  Frame,
  Paintbrush,
  Circle,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { getLevelBadgeStyle, CharacterRankIcon, cn } from '@/lib/utils'
import ProfileAvatarWithBadge from '@/components/characters/ProfileAvatarWithBadge'
import InSyncPlasmaEffect from '@/components/characters/InSyncPlasmaEffect'
import BlazeTextParticles from '@/components/characters/BlazeTextParticles'
import VoidNebulaEffect from '@/components/characters/VoidNebulaEffect'
import InfernoFireEffect from '@/components/characters/InfernoFireEffect'
import TintParticlesEffect from '@/components/characters/TintParticlesEffect'
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
  title?: string
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
  title,
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
  const [adminView, setAdminView] = useState(false)

  const isEffectiveAdmin = Boolean(isAdmin && adminView)

  function getOptionLockStatus(opt: CosmeticOption) {
    if (opt.unlockedByDefault) return { isUnlocked: true, label: '', badgeLabel: '', isHidden: false, title: '' }
    if (!opt.requiredAchievementId) return { isUnlocked: true, label: '', badgeLabel: '', isHidden: false, title: '' }
    const isUnlocked = unlockedAchievementIds.includes(opt.requiredAchievementId)
    const info = ACHIEVEMENT_INFO[opt.requiredAchievementId]
    const isHidden = info?.category === 'hidden'
    const title = info?.title || opt.requiredAchievementId
    const label = isUnlocked
      ? ''
      : isEffectiveAdmin
        ? `Requires achievement: ${title}${isHidden ? ' (Secret)' : ''}`
        : isHidden
          ? 'Locked (Secret Achievement)'
          : `Requires achievement: ${title}`
    const badgeLabel = isUnlocked
      ? ''
      : isEffectiveAdmin
        ? `Requires: ${title}${isHidden ? ' (Secret)' : ''}`
        : isHidden
          ? 'Locked'
          : `Requires: ${title}`

    return { isUnlocked, isHidden, label, badgeLabel, title }
  }

  function isOptionVisible(opt: CosmeticOption) {
    const { isUnlocked, isHidden } = getOptionLockStatus(opt)
    if (isUnlocked) return true
    if (isHidden && !isEffectiveAdmin) return false
    return true
  }

  function handleSelectOption(category: keyof CharacterCosmetics, opt: CosmeticOption) {
    const { isUnlocked, isHidden, title } = getOptionLockStatus(opt)
    if (!isUnlocked) {
      if (isEffectiveAdmin) {
        toast.error(`Locked cosmetic! Requires achievement: "${title}"${isHidden ? ' (Secret)' : ''}`)
      } else if (isHidden) {
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

  const renderColorSwatches = (colorKey: 'nameColor' | 'titleColor' | 'subtitleColor') => {
    const isDefaultSelected = !cosmetics[colorKey] || cosmetics[colorKey] === '' || cosmetics[colorKey] === 'default'
    const defaultFillClass =
      colorKey === 'nameColor'
        ? 'bg-foreground'
        : colorKey === 'titleColor'
          ? 'bg-amber-400'
          : 'bg-muted-foreground'

    return (
      <div className="flex flex-wrap gap-2.5 items-center">
        {/* Default Theme Color Swatch */}
        <button
          type="button"
          onClick={() => onChangeCosmetics((prev) => ({ ...prev, [colorKey]: '' }))}
          title={colorKey === 'titleColor' ? 'Default Yellow/Amber Italic' : 'Default Theme Color'}
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
          const isBlazeOpt = opt.value === 'blaze-fire-text' || opt.id === 'blaze_text'

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
                isBlazeOpt && 'bg-gradient-to-t from-red-600 via-orange-500 to-amber-300',
                isSelected
                  ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background scale-110 border-white dark:border-slate-900'
                  : isUnlocked
                    ? 'border-transparent hover:scale-105 shadow-sm'
                    : 'opacity-40 grayscale cursor-not-allowed border-border/40'
              )}
              style={!isRainbowOpt && !isGoldOpt && !isBlazeOpt ? { backgroundColor: opt.value } : {}}
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
              {isBlazeOpt && (
                <span className="text-[9px] font-black text-white drop-shadow-sm tracking-tighter">
                  🔥
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
      {/* Admin View Toggle Bar */}
      {isAdmin && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-400 shrink-0" />
            <div>
              <span className="font-semibold text-foreground">Admin Mode</span>
              <p className="text-[11px] text-muted-foreground">Reveal and inspect locked secret cosmetics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdminView(!adminView)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all',
              adminView
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-muted/60 hover:bg-muted text-muted-foreground border-border/70'
            )}
          >
            <span>{adminView ? 'Admin View: ON' : 'Admin View: OFF'}</span>
          </button>
        </div>
      )}

      {/* Live Calling Card Preview (Pinned at top) */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-1 pb-3 -mx-1 px-1 border-b border-border/60 shadow-md">
        <div className="p-3.5 rounded-xl bg-muted/40 border border-dashed border-border/80 space-y-2">
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
              'p-3 rounded-lg flex items-center justify-between gap-3 border transition-all relative overflow-visible',
              previewStyles.cardClassName
            )}
            style={previewStyles.cardStyle}
          >
          {previewStyles.cardClassName.includes('in-sync') && <InSyncPlasmaEffect />}
          {(previewStyles.cardClassName.includes('void-nebula') || cosmetics.bgColor === 'void_nebula' || cosmetics.bgColor === 'void-nebula-bg') && (
            <VoidNebulaEffect />
          )}
          {(previewStyles.cardClassName.includes('blaze-inferno') || cosmetics.bgColor === 'blaze_inferno_bg' || cosmetics.bgColor === 'blaze-inferno-bg') && (
            <InfernoFireEffect />
          )}
          {(previewStyles.cardClassName.includes('cyan-particle') || cosmetics.bgColor === 'cyan_particles' || cosmetics.bgColor === 'cyan-particle-bg') && (
            <TintParticlesEffect variant="cyan" />
          )}
          {(previewStyles.cardClassName.includes('crimson-particle') || cosmetics.bgColor === 'crimson_particles' || cosmetics.bgColor === 'crimson-particle-bg') && (
            <TintParticlesEffect variant="crimson" />
          )}
          <div className="flex items-center gap-3 min-w-0 relative z-10">
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
                <span className={cn('break-words relative', previewStyles.nameClassName)} style={previewStyles.nameStyle}>
                  {previewStyles.nameClassName.includes('blaze-fire-text') && <BlazeTextParticles />}
                  {characterName || 'Character Name'}
                </span>
                <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">
                  You
                </span>
              </div>
              {title ? (
                <div className={cn('relative', previewStyles.titleClassName)} style={previewStyles.titleStyle}>
                  {previewStyles.titleClassName.includes('blaze-fire-text') && <BlazeTextParticles />}
                  {title}
                </div>
              ) : (
                <div className={cn('relative', previewStyles.titleClassName)} style={previewStyles.titleStyle}>
                  {previewStyles.titleClassName.includes('blaze-fire-text') && <BlazeTextParticles />}
                  The Wanderer <span className="text-[9px] opacity-60 font-normal tracking-tight">(Sample Title)</span>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-0.5">
                <span className={cn('relative', previewStyles.subtitleClassName)} style={previewStyles.subtitleStyle}>
                  {previewStyles.subtitleClassName.includes('blaze-fire-text') && <BlazeTextParticles />}
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
      </div>

      {/* 1. Character Name Styling */}
      <div className="flex flex-col gap-3 p-3.5 rounded-lg bg-card/50 border border-border/60">
        <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5" />
          Name Customization
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold flex items-center gap-1.5">
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
              const { isUnlocked, isHidden, title: reqTitle } = getOptionLockStatus(f)
              return (
                <option key={f.id} value={f.id} disabled={!isUnlocked}>
                  {isUnlocked
                    ? f.name
                    : isAdmin
                      ? `🔒 ${f.name} (Requires: ${reqTitle}${isHidden ? ' - Secret' : ''})`
                      : isHidden
                        ? `🔒 ${f.name} (Secret Achievement)`
                        : `🔒 ${f.name} (Requires: ${reqTitle})`}
                </option>
              )
            })}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-purple-500" />
            Name Color
          </label>
          {renderColorSwatches('nameColor')}
        </div>
      </div>

      {/* 2. Character Title Styling */}
      <div className="flex flex-col gap-3 p-3.5 rounded-lg bg-card/50 border border-border/60">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" />
            Title Customization
          </span>
          {title ? (
            <span className="text-[10px] text-amber-400/90 font-medium italic lowercase">
              &quot;{title}&quot;
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground font-normal lowercase">
              (preview style)
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold flex items-center justify-between">
            <span>Title Font</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {title ? `Applied to: "${title}"` : 'Applied when granted by a GM'}
            </span>
          </label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
            value={cosmetics.titleFont || 'default'}
            onChange={(e) => {
              const opt = FONT_OPTIONS.find((f) => f.id === e.target.value)
              if (opt) handleSelectOption('titleFont', opt)
            }}
          >
            {FONT_OPTIONS.filter(isOptionVisible).map((f) => {
              const { isUnlocked, isHidden, title: reqTitle } = getOptionLockStatus(f)
              return (
                <option key={f.id} value={f.id} disabled={!isUnlocked}>
                  {isUnlocked
                    ? f.name
                    : isAdmin
                      ? `🔒 ${f.name} (Requires: ${reqTitle}${isHidden ? ' - Secret' : ''})`
                      : isHidden
                        ? `🔒 ${f.name} (Secret Achievement)`
                        : `🔒 ${f.name} (Requires: ${reqTitle})`}
                </option>
              )
            })}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-amber-400" />
              Title Color
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">
              (Default: Yellow/Amber Italic)
            </span>
          </label>
          {renderColorSwatches('titleColor')}
        </div>
      </div>

      {/* 3. Character Subtitle Styling (Ancestry & Class) */}
      <div className="flex flex-col gap-3 p-3.5 rounded-lg bg-card/50 border border-border/60">
        <div className="text-xs font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" />
            Subtitle Customization
          </span>
          <span className="text-[10px] text-muted-foreground font-normal">
            {ancestry || 'Ancestry'} {characterClass || 'Class'}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold flex items-center justify-between">
            <span>Subtitle Font</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              ({ancestry || 'Ancestry'} {characterClass || 'Class'})
            </span>
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
              const { isUnlocked, isHidden, title: reqTitle } = getOptionLockStatus(f)
              return (
                <option key={f.id} value={f.id} disabled={!isUnlocked}>
                  {isUnlocked
                    ? f.name
                    : isAdmin
                      ? `🔒 ${f.name} (Requires: ${reqTitle}${isHidden ? ' - Secret' : ''})`
                      : isHidden
                        ? `🔒 ${f.name} (Secret Achievement)`
                        : `🔒 ${f.name} (Requires: ${reqTitle})`}
                </option>
              )
            })}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-purple-400" />
              Subtitle Color
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">
              (Default: Muted Opacity)
            </span>
          </label>
          {renderColorSwatches('subtitleColor')}
        </div>
      </div>

      {/* 4. Card Border Effect & Shape */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold flex items-center gap-1.5">
          <Frame className="h-4 w-4 text-amber-500" />
          Card Border Effect & Shape
        </label>
        <div className="flex flex-col gap-2">
          {BORDER_SHAPE_OPTIONS.filter(isOptionVisible).map((opt) => {
            const { isUnlocked, label, badgeLabel } = getOptionLockStatus(opt)
            const isSelected = cosmetics.borderShape === opt.id || cosmetics.borderShape === opt.value
            const isSpecialBorder =
              opt.value.includes('-card-border') ||
              opt.value.includes('rainbow-border') ||
              opt.value.includes('void-rotating-border') ||
              opt.value.includes('in-sync-border')

            return (
              <button
                key={opt.id}
                type="button"
                data-selected={isSelected}
                onClick={() => handleSelectOption('borderShape', opt)}
                title={!isUnlocked ? label : opt.name}
                className={cn(
                  'w-full p-3 text-left text-xs transition-all flex items-center justify-between relative rounded-lg',
                  opt.value,
                  isSelected
                    ? isSpecialBorder
                      ? 'font-bold text-foreground'
                      : 'bg-purple-500/25 dark:bg-purple-950/50 font-bold text-foreground border-purple-500/50'
                    : isUnlocked
                      ? isSpecialBorder
                        ? 'text-foreground'
                        : 'bg-card/80 hover:bg-muted/40 text-foreground border-border/50'
                      : 'bg-muted/20 text-muted-foreground opacity-50 grayscale cursor-not-allowed'
                )}
              >
                {opt.id === 'in_sync_border' && isUnlocked && <InSyncPlasmaEffect />}
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

      {/* 5. Card Background Color / Tint */}
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

            const isClassTint = typeof opt.value === 'string' && (opt.value.endsWith('-bg-tint') || opt.value.endsWith('-bg'))

            return (
              <button
                key={opt.id}
                type="button"
                data-selected={isSelected}
                onClick={() => handleSelectOption('bgColor', opt)}
                title={!isUnlocked ? label : opt.name}
                className={cn(
                  'w-full p-3 rounded-lg text-left text-xs transition-all flex items-center justify-between border relative overflow-hidden',
                  isClassTint && opt.value,
                  isSelected
                    ? 'border-2 border-purple-500 ring-2 ring-purple-500 font-bold text-foreground'
                    : isUnlocked
                      ? 'border-border hover:border-muted-foreground text-foreground'
                      : 'border-border/40 opacity-50 grayscale cursor-not-allowed'
                )}
                style={{
                  backgroundColor: !isClassTint && opt.value ? opt.value : undefined,
                }}
              >
                {(opt.id === 'void_nebula' || opt.value === 'void-nebula-bg') && isUnlocked && (
                  <VoidNebulaEffect />
                )}
                {(opt.id === 'blaze_inferno_bg' || opt.value === 'blaze-inferno-bg') && isUnlocked && (
                  <InfernoFireEffect />
                )}
                {(opt.id === 'cyan_particles' || opt.value === 'cyan-particle-bg') && isUnlocked && (
                  <TintParticlesEffect variant="cyan" />
                )}
                {(opt.id === 'crimson_particles' || opt.value === 'crimson-particle-bg') && isUnlocked && (
                  <TintParticlesEffect variant="crimson" />
                )}
                <span className="font-semibold relative z-10">{opt.name}</span>
                {!isUnlocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0 relative z-10">
                    <Lock className="h-3 w-3" />
                    {badgeLabel}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 6. Profile Avatar Ring */}
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
              cosmetics.profileBorder === opt.value ||
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
