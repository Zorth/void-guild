import React from 'react'
import {
  MapPin, Castle, Crown, Skull, Swords, Shield, Mountain, Tent, Beer,
  Anchor, Flame, TreePine, Sparkles, BookOpen, Coins, Compass, Gem,
  Crosshair, Flag, Ghost, Eye
} from 'lucide-react'

export const PIN_ICONS = [
  { name: 'MapPin', label: 'Default Pin', icon: MapPin },
  { name: 'Castle', label: 'Castle / Keep', icon: Castle },
  { name: 'Crown', label: 'Capital / City', icon: Crown },
  { name: 'Skull', label: 'Dungeon / Danger', icon: Skull },
  { name: 'Swords', label: 'Battle / Conflict', icon: Swords },
  { name: 'Shield', label: 'Guard / Outpost', icon: Shield },
  { name: 'Mountain', label: 'Mountain / Peaks', icon: Mountain },
  { name: 'Tent', label: 'Camp / Caravan', icon: Tent },
  { name: 'Beer', label: 'Tavern / Inn', icon: Beer },
  { name: 'Anchor', label: 'Port / Harbor', icon: Anchor },
  { name: 'Flame', label: 'Forge / Fire', icon: Flame },
  { name: 'TreePine', label: 'Forest / Woods', icon: TreePine },
  { name: 'Sparkles', label: 'Magic / Arcane', icon: Sparkles },
  { name: 'BookOpen', label: 'Library / Lore', icon: BookOpen },
  { name: 'Coins', label: 'Market / Vault', icon: Coins },
  { name: 'Compass', label: 'Waypoint', icon: Compass },
  { name: 'Gem', label: 'Mine / Quarry', icon: Gem },
  { name: 'Crosshair', label: 'Target / Bounty', icon: Crosshair },
  { name: 'Flag', label: 'Settlement / Clan', icon: Flag },
  { name: 'Ghost', label: 'Crypt / Tomb', icon: Ghost },
  { name: 'Eye', label: 'Watchtower / Lookout', icon: Eye },
] as const

export function renderPinIcon(iconName?: string, className = "h-4 w-4 text-white") {
  if (iconName === 'Quest') {
    return <img src="/quest.svg" alt="Quest" className={`${className} object-contain`} />
  }
  const found = PIN_ICONS.find((item) => item.name === iconName)
  const IconComp = found ? found.icon : MapPin
  return <IconComp className={className} />
}
