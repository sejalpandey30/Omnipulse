import { TriviaQuestion } from '../types';
import { MatchEvent } from './matchEventBus';

export interface ValidatedTriviaQuestion extends TriviaQuestion {
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export const BASE_TRIVIA_QUESTIONS: ValidatedTriviaQuestion[] = [
  {
    id: 1,
    question: 'Who holds the record for the most UEFA Champions League titles in football history?',
    options: ['AC Milan', 'Real Madrid', 'Liverpool FC', 'FC Barcelona'],
    correctIndex: 1,
    explanation: 'Real Madrid has won an astounding 15 European Cup / Champions League titles!',
    funFact: 'They won the very first 5 tournaments consecutively between 1956 and 1960.',
    difficulty: 'EASY',
  },
  {
    id: 2,
    question: 'What is the maximum regulation time of a standard Premier League or FIFA football match without extra time?',
    options: ['80 Minutes', '90 Minutes', '100 Minutes', '60 Minutes'],
    correctIndex: 1,
    explanation: 'Two 45-minute halves make up the official 90 minutes of regulation play.',
    funFact: 'Stoppage time was originally introduced in 1891 after a goalkeeper kicked the ball out of the stadium to run down the clock!',
    difficulty: 'EASY',
  },
  {
    id: 3,
    question: 'In basketball, how many points is a shot taken from beyond the arc worth?',
    options: ['2 Points', '3 Points', '4 Points', '1 Point'],
    correctIndex: 1,
    explanation: 'Any basket scored from outside the designated three-point perimeter is worth 3 points.',
    funFact: 'The NBA first adopted the 3-point line in the 1979-1980 season.',
    difficulty: 'EASY',
  },
  {
    id: 4,
    question: 'Which country hosted the first ever FIFA World Cup tournament in 1930?',
    options: ['Brazil', 'Italy', 'Uruguay', 'France'],
    correctIndex: 2,
    explanation: 'Uruguay hosted and also won the inaugural 1930 FIFA World Cup.',
    funFact: 'The final match was played in Montevideo with balls provided by both finalists!',
    difficulty: 'MEDIUM',
  },
  {
    id: 5,
    question: 'In tactical football, what is the offside rule judged relative to when the ball is played?',
    options: [
      'The penalty spot',
      'The second-last defending opponent',
      'The halfway line only',
      'The goalkeeper only',
    ],
    correctIndex: 1,
    explanation: 'A player is offside if closer to the opponents’ goal line than both the ball and the second-last opponent.',
    funFact: 'Usually the goalkeeper is the last opponent, making the deepest defender the reference point.',
    difficulty: 'HARD',
  },
];

// Pure scoring function
export function calculateTriviaScore(
  isCorrect: boolean,
  timeLeftSeconds: number,
  currentStreak: number = 0
): { points: number; timeBonus: number; streakMultiplier: number } {
  if (!isCorrect) {
    return { points: 0, timeBonus: 0, streakMultiplier: 1.0 };
  }

  const basePoints = 100;
  const timeBonus = Math.max(0, Math.min(15, timeLeftSeconds) * 8);
  const streakMultiplier = 1.0 + Math.min(0.5, currentStreak * 0.1);

  const total = Math.round((basePoints + timeBonus) * streakMultiplier);
  return {
    points: total,
    timeBonus,
    streakMultiplier: parseFloat(streakMultiplier.toFixed(2)),
  };
}

// Generate template-based question from match event with plausible distractors
export function generateQuestionFromMatchEvent(event: MatchEvent): ValidatedTriviaQuestion {
  const matchRoster = ['K. Mbappé', 'Vinícius Jr.', 'J. Bellingham', 'F. Valverde', 'E. Haaland', 'K. De Bruyne'];

  if (event.type === 'OFFSIDE') {
    const caught = event.tacticalData?.offsidePlayer || event.players?.[0] || 'K. Mbappé';
    const distractors = matchRoster.filter((p) => p !== caught).slice(0, 3);
    const options = [caught, ...distractors].sort(() => 0.5 - Math.random());
    const correctIndex = options.indexOf(caught);

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      question: `Tactical Quiz: Which player was flagged in offside position during the ${event.time}' VAR review?`,
      options,
      correctIndex,
      explanation: `${caught} was positioned ahead of the defensive line when the pass was released.`,
      funFact: 'Semi-automated offside technology tracks 29 body points 50 times per second!',
      difficulty: 'MEDIUM',
    };
  }

  if (event.type === 'GOAL') {
    const scorer = event.tacticalData?.goalScorer || event.players?.[0] || 'Vinícius Jr.';
    const distractors = matchRoster.filter((p) => p !== scorer).slice(0, 3);
    const options = [scorer, ...distractors].sort(() => 0.5 - Math.random());
    const correctIndex = options.indexOf(scorer);

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      question: `Match Action: Who scored the spectacular goal at the ${event.time}' mark?`,
      options,
      correctIndex,
      explanation: `${scorer} finished the clinical attacking play into the top corner.`,
      funFact: 'That goal registered an expected goals (xG) value of just 0.12!',
      difficulty: 'EASY',
    };
  }

  // Generic Tactical Call Question
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    question: `Match Decision: What was the referee ruling at minute ${event.time}'?`,
    options: ['Free Kick Awarded', 'Corner Kick', 'Advantage Played', 'Throw In'],
    correctIndex: 0,
    explanation: event.explanation.casual,
    funFact: 'Referees run an average of 11 to 13 kilometers per professional match!',
    difficulty: 'EASY',
  };
}

export type BuzzerState = 'IDLE' | 'LOCKED_A' | 'LOCKED_B' | 'REBUTTAL_A' | 'REBUTTAL_B';

export class BuzzerController {
  private state: BuzzerState = 'IDLE';
  private rebuttalTimer: ReturnType<typeof setTimeout> | null = null;
  private onStateChange?: (state: BuzzerState) => void;

  constructor(onStateChange?: (state: BuzzerState) => void) {
    this.onStateChange = onStateChange;
  }

  public buzz(team: 'A' | 'B'): boolean {
    if (this.state === 'IDLE') {
      this.state = team === 'A' ? 'LOCKED_A' : 'LOCKED_B';
      this.onStateChange?.(this.state);
      return true;
    }

    if (this.state === 'REBUTTAL_A' && team === 'A') {
      this.state = 'LOCKED_A';
      this.clearRebuttal();
      this.onStateChange?.(this.state);
      return true;
    }

    if (this.state === 'REBUTTAL_B' && team === 'B') {
      this.state = 'LOCKED_B';
      this.clearRebuttal();
      this.onStateChange?.(this.state);
      return true;
    }

    return false;
  }

  public recordIncorrectAnswer(): void {
    if (this.state === 'LOCKED_A') {
      this.state = 'REBUTTAL_B';
      this.onStateChange?.(this.state);
      this.startRebuttalTimer();
    } else if (this.state === 'LOCKED_B') {
      this.state = 'REBUTTAL_A';
      this.onStateChange?.(this.state);
      this.startRebuttalTimer();
    }
  }

  private startRebuttalTimer(): void {
    this.clearRebuttal();
    this.rebuttalTimer = setTimeout(() => {
      this.reset();
    }, 5000); // 5-second rebuttal window
  }

  private clearRebuttal(): void {
    if (this.rebuttalTimer) {
      clearTimeout(this.rebuttalTimer);
      this.rebuttalTimer = null;
    }
  }

  public reset(): void {
    this.clearRebuttal();
    this.state = 'IDLE';
    this.onStateChange?.(this.state);
  }

  public getState(): BuzzerState {
    return this.state;
  }
}
