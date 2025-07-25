import { Conference } from "@/types/conference";

/**
 * Gets all unique ranks from conferences data
 */
export function getAllRanks(conferences: Conference[]): string[] {
  if (!Array.isArray(conferences)) return [];
  
  const ranks = new Set<string>();
  
  conferences.forEach(conf => {
    if (conf.rankings?.rank_name) {
      ranks.add(conf.rankings.rank_name);
    }
  });
  
  return Array.from(ranks).sort();
}