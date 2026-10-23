import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateTriviaScore,
  generateQuestionFromMatchEvent,
  BuzzerController,
} from '../core/triviaEngine';
import { MatchEvent } from '../core/matchEventBus';

describe('Trivia Engine: Scoring, Generation & Buzzer', () => {
  it('computes score with time bonus and streak multiplier', () => {
    // 0 streak, 10s left
    const res1 = calculateTriviaScore(true, 10, 0);
    // base (100) + timeBonus (10 * 8 = 80) = 180 * 1.0 = 180
    expect(res1.points).toBe(180);
    expect(res1.timeBonus).toBe(80);
    expect(res1.streakMultiplier).toBe(1.0);

    // 5 streak, 15s left
    const res2 = calculateTriviaScore(true, 15, 5);
    // base (100) + timeBonus (15 * 8 = 120) = 220 * 1.5 = 330
    expect(res2.points).toBe(330);
    expect(res2.streakMultiplier).toBe(1.5);

    // Incorrect answer
    const resWrong = calculateTriviaScore(false, 15, 5);
    expect(resWrong.points).toBe(0);
  });

  it('generates dynamic question from match event with plausible distractors', () => {
    const mockOffside: MatchEvent = {
      id: 'evt-offside-1',
      type: 'OFFSIDE',
      time: 68,
      explanation: { kid: '', casual: '', expert: '' },
      tacticalData: {
        offsidePlayer: 'K. Mbappé',
        defendingLineX: 68,
      },
    };

    const q = generateQuestionFromMatchEvent(mockOffside);
    expect(q.question).toContain("68'");
    expect(q.options).toContain('K. Mbappé');
    expect(q.options.length).toBe(4);
    expect(q.options[q.correctIndex]).toBe('K. Mbappé');
  });

  it('handles buzzer lockout and rebuttal logic deterministically', () => {
    const buzzer = new BuzzerController();
    expect(buzzer.getState()).toBe('IDLE');

    // Team A buzzes first
    const buzzedA = buzzer.buzz('A');
    expect(buzzedA).toBe(true);
    expect(buzzer.getState()).toBe('LOCKED_A');

    // Team B tries to buzz simultaneously -> locked out!
    const buzzedB = buzzer.buzz('B');
    expect(buzzedB).toBe(false);

    // Team A answers incorrectly -> unlocks 5s rebuttal for Team B
    buzzer.recordIncorrectAnswer();
    expect(buzzer.getState()).toBe('REBUTTAL_B');

    // Team B can now buzz in for rebuttal
    const rebuttalB = buzzer.buzz('B');
    expect(rebuttalB).toBe(true);
    expect(buzzer.getState()).toBe('LOCKED_B');
  });
});
