import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with commas for display
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

/**
 * Calculate time remaining until a date
 */
export function timeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return "Now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Get reputation points for a claim based on difficulty
 */
export function getReputationPoints(
  difficulty: "EASY" | "MEDIUM" | "HARD",
  isCorrect: boolean
): number {
  const points = {
    EASY: { correct: 20, wrong: -10 },
    MEDIUM: { correct: 25, wrong: -12 },
    HARD: { correct: 30, wrong: -15 },
  };
  return isCorrect ? points[difficulty].correct : points[difficulty].wrong;
}

/**
 * Credit costs
 */
export const CREDIT_COSTS = {
  VOTE: 1,
  REVEAL_EARLY: 5,
} as const;

/**
 * Credit rewards
 */
export const CREDIT_REWARDS = {
  GUEST_INITIAL: 4,
  SIGNUP_BONUS: 5,
  NEWSLETTER_BONUS: 5,
  DAILY_LOGIN: 10,
  STREAK_7_DAYS: 20,
} as const;

/**
 * Reveal timer duration in milliseconds (6 hours)
 */
export const REVEAL_TIMER_MS = 6 * 60 * 60 * 1000;
