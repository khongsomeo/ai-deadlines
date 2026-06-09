// src/utils/constants.ts

export const CATEGORY_CONFIG = [
  { id: "machine-learning", label: "Machine Learning", color: "bg-purple-500" },
  { id: "multimedia", label: "Multimedia", color: "bg-fuchsia-500" },
  { id: "robotics", label: "Robotics", color: "bg-green-500" },
  { id: "computer-vision", label: "Computer Vision", color: "bg-orange-500" },
  { id: "data-mining", label: "Data Mining", color: "bg-pink-500" },
  { id: "natural-language-processing", label: "Natural Language Processing", color: "bg-blue-500" },
  { id: "signal-processing", label: "Signal Processing", color: "bg-cyan-500" },
  { id: "speech-processing", label: "Speech Processing", color: "bg-yellow-500" },
  { id: "human-computer-interaction", label: "Human Computer Interaction", color: "bg-sky-500" },
  { id: "information-theory", label: "Information Theory", color: "bg-red-500" },
  { id: "information-retrieval", label: "Information Retrieval", color: "bg-lime-500" },
  { id: "cryptography", label: "Cryptography", color: "bg-indigo-500" },
  { id: "security-and-privacy", label: "Security & Privacy", color: "bg-teal-500" },
] as const;

export const CATEGORY_LABELS = new Map(CATEGORY_CONFIG.map(c => [c.id, c.label]));
export const CATEGORY_COLORS = new Map(CATEGORY_CONFIG.map(c => [c.id, c.color]));
export const ORDERED_CATEGORIES = CATEGORY_CONFIG.map(c => c.id);

// The single source of truth for Ranks
export const RANK_CONFIG = [
  { id: "A*", label: "A*", color: "text-red-600 dark:text-red-400", priority: 1 },
  { id: "A", label: "A", color: "text-orange-600 dark:text-orange-400", priority: 2 },
  { id: "B", label: "B", color: "text-blue-600 dark:text-blue-400", priority: 3 },
  { id: "C", label: "C", color: "text-green-600 dark:text-green-400", priority: 4 },
] as const;

// Strict fallback for unknown/unconfigured ranks to guarantee they sort to the bottom
export const DEFAULT_RANK_PRIORITY = Number.MAX_SAFE_INTEGER;
export const DEFAULT_RANK_COLOR = "text-gray-600 dark:text-gray-400";
export const UNRANKED_BADGE_COLOR = "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";

// Derived O(1) Maps (js-index-maps)
export const RANK_COLORS = new Map(RANK_CONFIG.map(r => [r.id, r.color]));
export const RANK_PRIORITIES = new Map(RANK_CONFIG.map(r => [r.id, r.priority]));
