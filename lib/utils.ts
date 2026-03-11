import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLevelBadgeStyle(level: number | undefined) {
  if (level === undefined || level === 0) return { backgroundColor: '#1f2937', color: '#f9fafb' }; // Inverted (dark) for TBD

  const keyframes = [
    { lvl: 1, color: [255, 255, 255] }, // White
    { lvl: 5, color: [30, 58, 138] },   // Deep Blue
    { lvl: 10, color: [88, 28, 135] },  // Deep Purple
    { lvl: 15, color: [217, 70, 239] }, // Bright Magenta
    { lvl: 20, color: [245, 158, 11] }, // Golden Sunset Orange
  ];

  let start = keyframes[0];
  let end = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (level >= keyframes[i].lvl && level <= keyframes[i+1].lvl) {
      start = keyframes[i];
      end = keyframes[i+1];
      break;
    }
  }

  const range = end.lvl - start.lvl;
  const progress = range === 0 ? 0 : (level - start.lvl) / range;

  const r = Math.round(start.color[0] + (end.color[0] - start.color[0]) * progress);
  const g = Math.round(start.color[1] + (end.color[1] - start.color[1]) * progress);
  const b = Math.round(start.color[2] + (end.color[2] - start.color[2]) * progress);

  // Determine text color based on luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance > 0.5 ? '#1f2937' : '#ffffff';

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
    border: luminance > 0.9 ? '1px solid #e5e7eb' : 'none'
  };
}
