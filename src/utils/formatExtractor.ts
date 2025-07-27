import { Conference } from "@/types/conference";

/**
 * Gets all unique formats from conferences data
 */
export function getAllFormats(conferences: Conference[]): string[] {
  if (!Array.isArray(conferences)) return [];
  
  const formats = new Set<string>();
  
  conferences.forEach(conf => {
    if (conf.format) {
      formats.add(conf.format);
    }
  });
  
  return Array.from(formats).sort();
}