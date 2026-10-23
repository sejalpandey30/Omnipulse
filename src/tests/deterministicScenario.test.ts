import { describe, it, expect, beforeEach } from 'vitest';
import { MatchEventBus, MatchEvent } from '../core/matchEventBus';
import { appReducer, INITIAL_STATE, AppState } from '../core/store';
import { generateQuestionFromMatchEvent, calculateTriviaScore } from '../core/triviaEngine';
import { RepStateMachine, SkeletonPose } from '../components/fitness/fitnessPipeline';

describe('Deterministic End-to-End Matchday Scenario', () => {
  let state: AppState;
  let bus: MatchEventBus;

  beforeEach(() => {
    state = INITIAL_STATE;
    bus = new MatchEventBus();
  });

  it('runs deterministic matchday sequence: Offside ➔ Quiz ➔ Halftime Reps ➔ Badge Award', () => {
    // 1. Publish Match Event: OFFSIDE
    const offsideEvent: MatchEvent = {
      id: 'scenario-offside-64',
      type: 'OFFSIDE',
      time: 64,
      players: ['K. Mbappé'],
      explanation: { kid: 'Offside', casual: 'Offside', expert: 'Offside' },
      tacticalData: {
        offsidePlayer: 'K. Mbappé',
        defendingLineX: 68,
      },
    };

    const published = bus.publish(offsideEvent);
    expect(published).toBe(true);

    // 2. Generate Quiz Question from Event
    const quiz = generateQuestionFromMatchEvent(offsideEvent);
    expect(quiz.options[quiz.correctIndex]).toBe('K. Mbappé');

    // 3. User answers correctly with 12s left on clock
    const scoreResult = calculateTriviaScore(true, 12, state.profiles[0].streak);
    expect(scoreResult.points).toBeGreaterThan(0);

    // Update store state with trivia score & answer
    state = appReducer(state, {
      type: 'UPDATE_PROFILE_SCORE',
      profileId: state.activeProfileId,
      deltaPoints: scoreResult.points,
    });
    state = appReducer(state, {
      type: 'RECORD_TRIVIA_ANSWER',
      questionId: quiz.id,
      isCorrect: true,
    });
    state = appReducer(state, {
      type: 'ADD_PROFILE_BADGE',
      profileId: state.activeProfileId,
      badge: 'Trivia Champ',
    });

    const activeUser = state.profiles.find((p) => p.id === state.activeProfileId);
    expect(activeUser?.badges).toContain('Trivia Champ');
    expect(activeUser?.score).toBe(INITIAL_STATE.profiles[0].score + scoreResult.points);
    expect(state.trivia.seenQuestionIds).toContain(quiz.id);

    // 4. Halftime Fitness Challenge with 10 simulated reps
    const initialFitnessHistoryCount = state.fitnessHistory.length;
    state = appReducer(state, {
      type: 'RECORD_FITNESS_SESSION',
      record: {
        profileId: state.activeProfileId,
        exercise: 'Squats',
        reps: 10,
        formScore: 94,
        calories: 30,
      },
    });
    state = appReducer(state, {
      type: 'ADD_PROFILE_BADGE',
      profileId: state.activeProfileId,
      badge: 'Halftime Hero',
    });

    expect(state.fitnessHistory.length).toBe(initialFitnessHistoryCount + 1);
    expect(state.fitnessHistory[0].reps).toBe(10);
    const updatedUser = state.profiles.find((p) => p.id === state.activeProfileId);
    expect(updatedUser?.badges).toContain('Halftime Hero');
  });
});
