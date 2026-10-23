import { HighlightMoment, PlayerStats } from '../../types';

export interface SportsMatchClockState {
  matchMinute: number;
  isPlaying: boolean;
  playbackRate: number;
}

/**
 * Deterministic Win Probability Formula
 *
 * Evaluates the home team victory likelihood using logistic regression
 * driven by score differential, remaining match duration, and real-time tactical momentum.
 *
 * Formula:
 *   goalDiff = homeScore - awayScore
 *   timeWeight = (90 - clamp(minute, 0, 90)) / 90  (influence of momentum dampens near full time)
 *   z = (goalDiff * 1.55) + (momentum * 0.75 * timeWeight) + 0.35 (home ground advantage)
 *   P(Home Win) = 1 / (1 + exp(-z))
 */
export function calculateDeterministicWinProbability(
  homeScore: number,
  awayScore: number,
  minute: number,
  momentum: number // -1.0 to +1.0
): number {
  const goalDiff = homeScore - awayScore;
  const timeWeight = (90 - Math.min(90, Math.max(0, minute))) / 90;
  const homeAdvantage = 0.32;

  // Logit score
  const z = goalDiff * 1.55 + momentum * 0.75 * (0.3 + 0.7 * timeWeight) + homeAdvantage;

  // Standard sigmoid function
  const probability = 1 / (1 + Math.exp(-z));

  // Scale to percentage and clamp safely between 5% and 95%
  const percentage = Math.round(probability * 100);
  return Math.min(95, Math.max(5, percentage));
}

export interface HighlightRankingRule {
  category: HighlightMoment['category'];
  baseImpactScore: number;
}

export const HIGHLIGHT_RANKING_RULES: Record<string, number> = {
  Goal: 100,
  'VAR Review': 85,
  'Tactical Counter': 70,
  Save: 65,
};

export class HighlightManager {
  private highlights: HighlightMoment[] = [];

  constructor(initial: HighlightMoment[] = []) {
    this.highlights = [...initial];
  }

  public getHighlights(): HighlightMoment[] {
    return [...this.highlights].sort((a, b) => {
      const scoreA = HIGHLIGHT_RANKING_RULES[a.category] || 50;
      const scoreB = HIGHLIGHT_RANKING_RULES[b.category] || 50;
      return scoreB - scoreA;
    });
  }

  public addHighlight(moment: HighlightMoment): boolean {
    const minuteNum = parseInt(moment.timestamp.replace(/[^0-9]/g, ''), 10) || 0;

    // Deduplication check within +/- 2 minutes
    const isDuplicate = this.highlights.some((h) => {
      const existingMin = parseInt(h.timestamp.replace(/[^0-9]/g, ''), 10) || 0;
      return Math.abs(existingMin - minuteNum) <= 2 && h.category === moment.category;
    });

    if (isDuplicate) return false;

    this.highlights.push(moment);
    return true;
  }
}
