import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  appReducer,
  INITIAL_STATE,
  loadPersistedState,
  savePersistedState,
  CURRENT_SCHEMA_VERSION,
  APP_STORAGE_KEY,
  V1_STORAGE_KEY,
  V1_ACTIVE_KEY,
  selectActiveProfile,
  selectTotalFitnessReps,
  FamilyProfile,
} from '../core/store';

// In-memory mock for localStorage in Node runtime
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

beforeAll(() => {
  (globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
  (globalThis as unknown as { window: { localStorage: typeof localStorageMock } }).window = {
    localStorage: localStorageMock,
  };
});

describe('Central App Store & Reducer', () => {
  it('handles SET_ACTIVE_PROFILE correctly', () => {
    const next = appReducer(INITIAL_STATE, { type: 'SET_ACTIVE_PROFILE', profileId: 'mom' });
    expect(next.activeProfileId).toBe('mom');
  });

  it('ignores SET_ACTIVE_PROFILE for unknown profileId', () => {
    const next = appReducer(INITIAL_STATE, { type: 'SET_ACTIVE_PROFILE', profileId: 'ghost' });
    expect(next.activeProfileId).toBe(INITIAL_STATE.activeProfileId);
  });

  it('updates profile score and clamps to zero minimum', () => {
    const state = appReducer(INITIAL_STATE, {
      type: 'UPDATE_PROFILE_SCORE',
      profileId: 'dad',
      deltaPoints: 100,
    });
    const dad = state.profiles.find((p) => p.id === 'dad');
    expect(dad?.score).toBe(INITIAL_STATE.profiles[0].score + 100);

    const decremented = appReducer(state, {
      type: 'UPDATE_PROFILE_SCORE',
      profileId: 'dad',
      deltaPoints: -9999,
    });
    const dadDec = decremented.profiles.find((p) => p.id === 'dad');
    expect(dadDec?.score).toBe(0);
  });

  it('adds badges without duplicating', () => {
    const state = appReducer(INITIAL_STATE, {
      type: 'ADD_PROFILE_BADGE',
      profileId: 'dad',
      badge: 'Golden Whistle',
    });
    const dad = state.profiles.find((p) => p.id === 'dad');
    expect(dad?.badges).toContain('Golden Whistle');

    // Duplicate attempt
    const state2 = appReducer(state, {
      type: 'ADD_PROFILE_BADGE',
      profileId: 'dad',
      badge: 'Golden Whistle',
    });
    const dad2 = state2.profiles.find((p) => p.id === 'dad');
    expect(dad2?.badges.filter((b) => b === 'Golden Whistle').length).toBe(1);
  });

  it('increments streak count', () => {
    const dadInitialStreak = INITIAL_STATE.profiles[0].streak;
    const state = appReducer(INITIAL_STATE, {
      type: 'INCREMENT_PROFILE_STREAK',
      profileId: 'dad',
    });
    const dad = state.profiles.find((p) => p.id === 'dad');
    expect(dad?.streak).toBe(dadInitialStreak + 1);
  });

  it('records fitness session into history', () => {
    const state = appReducer(INITIAL_STATE, {
      type: 'RECORD_FITNESS_SESSION',
      record: {
        profileId: 'dad',
        exercise: 'Squats',
        reps: 15,
        formScore: 92,
        calories: 45,
      },
    });
    expect(state.fitnessHistory.length).toBe(1);
    expect(state.fitnessHistory[0].reps).toBe(15);
    expect(selectTotalFitnessReps(state, 'dad')).toBe(15);
  });
});

describe('Storage Migrations & Validation', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('loads default initial state when storage is empty', () => {
    const loaded = loadPersistedState();
    expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.profiles.length).toBe(4);
  });

  it('safely recovers when storage contains corrupted JSON', () => {
    localStorageMock.setItem(APP_STORAGE_KEY, '{ invalid corrupt json %$#');
    const loaded = loadPersistedState();
    expect(loaded.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.activeProfileId).toBe('dad');
  });

  it('migrates from v1 storage to v2 schema cleanly', () => {
    const v1Data: FamilyProfile[] = [
      {
        id: 'legacy_user',
        name: 'Legacy Hero',
        avatar: '🧙‍♂️',
        favoriteTeam: 'Real Madrid',
        explainLevel: 'expert',
        preferredInput: 'remote',
        commentaryTone: 'serious',
        score: 999,
        streak: 10,
        badges: ['Veteran'],
      },
    ];
    localStorageMock.setItem(V1_STORAGE_KEY, JSON.stringify(v1Data));
    localStorageMock.setItem(V1_ACTIVE_KEY, 'legacy_user');

    const migrated = loadPersistedState();
    expect(migrated.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.activeProfileId).toBe('legacy_user');
    expect(migrated.profiles[0].name).toBe('Legacy Hero');
    expect(migrated.profiles[0].score).toBe(999);
  });
});
