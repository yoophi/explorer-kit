/** Display sizing copied from both folder and bookmark tag clouds. */
export function tagCloudSizeClass(count: number, largestCount: number) {
  const ratio = largestCount ? count / largestCount : 0;
  if (ratio >= 0.75) return "h-9 px-4 text-sm font-semibold";
  if (ratio >= 0.4) return "h-8 px-3 text-sm";
  return "h-7 px-2 text-xs";
}

/** Seeded order extracted from movie-folder-explorer. Does not mutate the input. */
export function shuffledRank(value: string, seed: number) {
  let hash = seed;
  for (let index = 0; index < value.length; index++) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x5bd1e995);
  }
  return hash >>> 0;
}

/** Text normalization for display tags, not filesystem paths or URL identities. */
export function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function countTags<T>(items: readonly T[], tagsOf: (item: T) => readonly string[]) {
  const counts = new Map<string, { key: string; label: string; count: number }>();
  for (const item of items) {
    const seen = new Set<string>();
    for (const value of tagsOf(item)) {
      const key = normalizeTag(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const existing = counts.get(key);
      if (existing) existing.count++;
      else counts.set(key, { key, label: value.trim().replace(/\s+/g, " "), count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label));
}
