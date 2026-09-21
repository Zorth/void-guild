export const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * Returns formatted quest level string for Discord display.
 */
export const getQuestLevelStr = (q: any): string => {
  const pf = q.levelPF ?? (q.levelDnD === undefined ? q.level : undefined);
  const dnd = q.levelDnD;
  if (pf !== undefined && dnd !== undefined) return `Lvl PF:${pf}/DnD:${dnd}`;
  if (pf !== undefined) return `Lvl PF:${pf}`;
  if (dnd !== undefined) return `Lvl DnD:${dnd}`;
  return "Lvl ?";
};

/**
 * Formats an in-game date object into calendar string representation.
 */
export const formatInGameDate = (ig: any, eras: any[] = [], globalYearZero: boolean = false): string => {
  if (!ig) return "";

  const formatPart = (y: number, m: number, d: number) => {
    if (ig.era) {
      return `${ig.era} ${y}/${String(m + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
    }

    if (!eras || eras.length === 0) {
      return `${y}/${String(m + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
    }

    // Sort eras by their date (year) ascending to find the right one
    const sortedEras = [...eras].sort((a, b) => {
      const yearA = typeof a.date === 'object' ? a.date.year : a.date;
      const yearB = typeof b.date === 'object' ? b.date.year : b.date;
      return yearA - yearB;
    });

    // Find the era that this year falls into
    let currentEra = sortedEras[0];
    for (const era of sortedEras) {
      const eraDateValue = typeof era.date === 'object' ? era.date.year : era.date;
      if (y >= eraDateValue) {
        currentEra = era;
      } else {
        break;
      }
    }

    const eraDateValue = typeof currentEra.date === 'object' ? currentEra.date.year : currentEra.date;

    let eraYear;
    // If restart is false, we show the absolute year
    const yearZeroExists = currentEra.year_zero_exists ?? currentEra.settings?.year_zero_exists ?? globalYearZero;
    if (currentEra.settings?.restart === false) {
      eraYear = y;
    } else {
      eraYear = y - eraDateValue + (yearZeroExists ? 0 : 1);
    }

    let eraLabel = currentEra.abbreviation || currentEra.name;
    if (currentEra.name.length > 15 && !currentEra.abbreviation) {
      eraLabel = currentEra.name
        .split(/[\s-]+/)
        .map((word: string) => word[0]?.toUpperCase())
        .join('');
    }

    return `${eraLabel} ${eraYear}/${String(m + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
  };

  const start = formatPart(ig.year, ig.month, ig.day);
  if (ig.endDay) {
    const ey = ig.endYear ?? ig.year;
    const em = ig.endMonth ?? ig.month;
    const end = formatPart(ey, em, ig.endDay);
    return `${start} - ${end}`;
  }
  return start;
};
