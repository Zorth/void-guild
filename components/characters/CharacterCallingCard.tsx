'use client'

import React from 'react'
import { cn, getLevelBadgeStyle, CharacterRankIcon } from '@/lib/utils'
import { resolveCosmeticsStyles, CharacterCosmetics } from '@/lib/cosmetics'
import ProfileAvatarWithBadge from '@/components/characters/ProfileAvatarWithBadge'
import InSyncPlasmaEffect from '@/components/characters/InSyncPlasmaEffect'
import BlazeTextParticles from '@/components/characters/BlazeTextParticles'
import VoidNebulaEffect from '@/components/characters/VoidNebulaEffect'
import InfernoFireEffect from '@/components/characters/InfernoFireEffect'
import TintParticlesEffect from '@/components/characters/TintParticlesEffect'
import { Book } from 'lucide-react'

export interface CharacterCallingCardProps {
  name: string
  title?: string
  ancestry?: string
  characterClass?: string
  lvl: number
  rank?: string
  system?: 'PF' | 'DnD'
  websiteLink?: string
  imageUrl?: string | null
  cosmetics?: CharacterCosmetics | null
  rankNumber?: number
  streak?: number
  isYou?: boolean
  className?: string
  onWikiClick?: () => void
}

export default function CharacterCallingCard({
  name,
  title,
  ancestry,
  characterClass,
  lvl,
  rank,
  system,
  websiteLink,
  imageUrl,
  cosmetics,
  rankNumber,
  streak,
  isYou = false,
  className,
  onWikiClick,
}: CharacterCallingCardProps) {
  const styles = resolveCosmeticsStyles(cosmetics)

  return (
    <div
      className={cn(
        'p-3.5 rounded-lg flex items-center justify-between gap-3 border transition-all relative overflow-visible',
        styles.cardClassName || 'bg-muted/20 border-border/60',
        className
      )}
      style={styles.cardStyle}
    >
      {styles.cardClassName.includes('in-sync') && <InSyncPlasmaEffect />}
      {(styles.cardClassName.includes('void-nebula') ||
        cosmetics?.bgColor === 'void_nebula' ||
        cosmetics?.bgColor === 'void-nebula-bg') && <VoidNebulaEffect />}
      {(styles.cardClassName.includes('blaze-inferno') ||
        cosmetics?.bgColor === 'blaze_inferno_bg' ||
        cosmetics?.bgColor === 'blaze-inferno-bg') && <InfernoFireEffect />}
      {(styles.cardClassName.includes('cyan-particle') ||
        cosmetics?.bgColor === 'cyan_particles' ||
        cosmetics?.bgColor === 'cyan-particle-bg') && <TintParticlesEffect variant="cyan" />}
      {(styles.cardClassName.includes('crimson-particle') ||
        cosmetics?.bgColor === 'crimson_particles' ||
        cosmetics?.bgColor === 'crimson-particle-bg') && <TintParticlesEffect variant="crimson" />}

      {/* Left: Avatar & Info */}
      <div className="flex items-center gap-3 min-w-0 relative z-10">
        <ProfileAvatarWithBadge
          imageUrl={imageUrl}
          name={name}
          cosmetics={cosmetics}
          profileRingClassName={styles.profileRingClassName}
          rankNumber={rankNumber}
          streak={streak}
          size="lg"
        />
        <div className="min-w-0">
          <div className="font-bold flex items-center flex-wrap gap-2">
            <span
              className={cn('break-words relative', styles.nameClassName)}
              style={styles.nameStyle}
            >
              {styles.nameClassName?.includes('blaze-fire-text') && <BlazeTextParticles />}
              {name}
            </span>
            {isYou && (
              <span className="text-[10px] bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">
                You
              </span>
            )}
            <a
              href={`https://void.tarragon.be/Player-Characters/${name.replace(/\s+/g, '-')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation()
                onWikiClick?.()
              }}
              className="text-muted-foreground hover:text-purple-500 shrink-0 inline-flex items-center"
              title="View on Wiki"
            >
              <Book size={15} />
            </a>
          </div>

          {title && (
            <div
              className={cn('relative truncate text-xs', styles.titleClassName)}
              style={styles.titleStyle}
            >
              {styles.titleClassName?.includes('blaze-fire-text') && <BlazeTextParticles />}
              {title}
            </div>
          )}

          {(ancestry || characterClass) && (
            <div
              className={cn('relative truncate text-xs', styles.subtitleClassName)}
              style={styles.subtitleStyle}
            >
              {styles.subtitleClassName?.includes('blaze-fire-text') && <BlazeTextParticles />}
              {[ancestry, characterClass].filter(Boolean).join(' ')}
            </div>
          )}

          {websiteLink && (
            <a
              href={websiteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:underline truncate max-w-full block mt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {websiteLink}
            </a>
          )}
        </div>
      </div>

      {/* Right: Badges */}
      <div className="flex items-center gap-1.5 shrink-0 relative z-10">
        <CharacterRankIcon rank={rank} />
        {system && (
          <img
            src={system === 'PF' ? '/PFVoid.svg' : '/DnDVoid.svg'}
            alt={system}
            className="h-4 w-4"
          />
        )}
        <span
          className="inline-flex align-middle justify-center w-14 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
          style={getLevelBadgeStyle(lvl)}
        >
          Lvl {lvl}
        </span>
      </div>
    </div>
  )
}
