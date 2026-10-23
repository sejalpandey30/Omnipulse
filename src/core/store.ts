import React, { createContext, useContext, useReducer, useEffect, useMemo, ReactNode } from 'react';
import { appLogger } from './logger';

export type ExplainLevel = 'kid' | 'casual' | 'expert';
export type CommentaryTone = 'serious' | 'hype' | 'comedian';
export type PreferredInput = 'voice' | 'gesture' | 'remote';

export interface FamilyProfile {
  id: string;
  name: string;
  avatar: string;
  favoriteTeam: string;
  explainLevel: ExplainLevel;
  preferredInput: PreferredInput;
  commentaryTone: CommentaryTone;
  score: number;
  streak: number;
  badges: string[];
  isLowTech?: boolean;
}

export interface AppSettings {
  soundEnabled: boolean;
  simulationMode: boolean;
  perfOverlay: boolean;
}

export interface MatchState {
  matchId: string;
  time: number;
  isPlaying: boolean;
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  momentum: number; // -1.0 to 1.0 (positive favours Home)
  homeWinProb: number;
  cameraAngle: 'Broadcast' | 'Tactical 3D' | 'Player ISO';
}

export interface TriviaState {
  seenQuestionIds: number[];
  recentAccuracy: boolean[]; // rolling last 10
  teamScores: { teamA: number; teamB: number };
}

export interface FitnessSessionRecord {
  id: string;
  profileId: string;
  exercise: string;
  reps: number;
  formScore: number;
  calories: number;
  timestamp: number;
}

export interface AppState {
  version: number;
  activeProfileId: string;
  profiles: FamilyProfile[];
  settings: AppSettings;
  match: MatchState;
  trivia: TriviaState;
  fitnessHistory: FitnessSessionRecord[];
}

export const CURRENT_SCHEMA_VERSION = 2;
export const APP_STORAGE_KEY = 'omnipulse_app_state_v2';
export const V1_STORAGE_KEY = 'omnipulse_family_profiles_v1';
export const V1_ACTIVE_KEY = 'omnipulse_active_profile_id_v1';

export const SEEDED_PROFILES: FamilyProfile[] = [
  {
    id: 'dad',
    name: 'Dad (Dave)',
    avatar: '👨‍💼',
    favoriteTeam: 'Real Madrid',
    explainLevel: 'expert',
    preferredInput: 'remote',
    commentaryTone: 'serious',
    score: 450,
    streak: 5,
    badges: ['Tactical Master', 'Halftime Hero'],
    isLowTech: false,
  },
  {
    id: 'mom',
    name: 'Mom (Sarah)',
    avatar: '👩‍⚕️',
    favoriteTeam: 'Real Madrid',
    explainLevel: 'casual',
    preferredInput: 'voice',
    commentaryTone: 'hype',
    score: 520,
    streak: 6,
    badges: ['Trivia Champ', 'Cheer Leader'],
    isLowTech: false,
  },
  {
    id: 'teen',
    name: 'Teen (Leo)',
    avatar: '🏄‍♂️',
    favoriteTeam: 'Man City',
    explainLevel: 'casual',
    preferredInput: 'gesture',
    commentaryTone: 'hype',
    score: 610,
    streak: 7,
    badges: ['Rapid Reps', 'Top Striker'],
    isLowTech: false,
  },
  {
    id: 'kid',
    name: 'Kid (Maya)',
    avatar: '👧',
    favoriteTeam: 'Real Madrid',
    explainLevel: 'kid',
    preferredInput: 'voice',
    commentaryTone: 'comedian',
    score: 380,
    streak: 3,
    badges: ['Super Learner', 'Energy Star'],
    isLowTech: false,
  },
];

export const INITIAL_STATE: AppState = {
  version: CURRENT_SCHEMA_VERSION,
  activeProfileId: 'dad',
  profiles: SEEDED_PROFILES,
  settings: {
    soundEnabled: true,
    simulationMode: true,
    perfOverlay: false,
  },
  match: {
    matchId: 'match-rm-mci-2026',
    time: 58,
    isPlaying: true,
    homeScore: 2,
    awayScore: 1,
    homeTeam: 'Real Madrid',
    awayTeam: 'Man City',
    momentum: 0.25,
    homeWinProb: 64,
    cameraAngle: 'Tactical 3D',
  },
  trivia: {
    seenQuestionIds: [],
    recentAccuracy: [],
    teamScores: { teamA: 0, teamB: 0 },
  },
  fitnessHistory: [],
};

// Pure Reducer Actions
export type AppAction =
  | { type: 'SET_ACTIVE_PROFILE'; profileId: string }
  | { type: 'UPDATE_PROFILE_SCORE'; profileId: string; deltaPoints: number }
  | { type: 'ADD_PROFILE_BADGE'; profileId: string; badge: string }
  | { type: 'INCREMENT_PROFILE_STREAK'; profileId: string }
  | { type: 'SET_PROFILE_LEVEL'; profileId: string; level: ExplainLevel }
  | { type: 'SET_PROFILE_TONE'; profileId: string; tone: CommentaryTone }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'UPDATE_MATCH'; match: Partial<MatchState> }
  | { type: 'RECORD_TRIVIA_ANSWER'; questionId: number; isCorrect: boolean }
  | { type: 'UPDATE_TRIVIA_SCORES'; teamA: number; teamB: number }
  | { type: 'RECORD_FITNESS_SESSION'; record: Omit<FitnessSessionRecord, 'id' | 'timestamp'> }
  | { type: 'RESET_TO_DEFAULTS' };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_PROFILE': {
      if (!state.profiles.some((p) => p.id === action.profileId)) return state;
      return { ...state, activeProfileId: action.profileId };
    }

    case 'UPDATE_PROFILE_SCORE': {
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.profileId ? { ...p, score: Math.max(0, p.score + action.deltaPoints) } : p
        ),
      };
    }

    case 'ADD_PROFILE_BADGE': {
      return {
        ...state,
        profiles: state.profiles.map((p) => {
          if (p.id !== action.profileId || p.badges.includes(action.badge)) return p;
          return { ...p, badges: [...p.badges, action.badge] };
        }),
      };
    }

    case 'INCREMENT_PROFILE_STREAK': {
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.profileId ? { ...p, streak: p.streak + 1 } : p
        ),
      };
    }

    case 'SET_PROFILE_LEVEL': {
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.profileId ? { ...p, explainLevel: action.level } : p
        ),
      };
    }

    case 'SET_PROFILE_TONE': {
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.profileId ? { ...p, commentaryTone: action.tone } : p
        ),
      };
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: { ...state.settings, ...action.settings },
      };
    }

    case 'UPDATE_MATCH': {
      return {
        ...state,
        match: { ...state.match, ...action.match },
      };
    }

    case 'RECORD_TRIVIA_ANSWER': {
      const seen = state.trivia.seenQuestionIds.includes(action.questionId)
        ? state.trivia.seenQuestionIds
        : [...state.trivia.seenQuestionIds, action.questionId];
      const accuracy = [...state.trivia.recentAccuracy, action.isCorrect].slice(-10);
      return {
        ...state,
        trivia: {
          ...state.trivia,
          seenQuestionIds: seen,
          recentAccuracy: accuracy,
        },
      };
    }

    case 'UPDATE_TRIVIA_SCORES': {
      return {
        ...state,
        trivia: {
          ...state.trivia,
          teamScores: { teamA: action.teamA, teamB: action.teamB },
        },
      };
    }

    case 'RECORD_FITNESS_SESSION': {
      const record: FitnessSessionRecord = {
        ...action.record,
        id: `fit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
      };
      return {
        ...state,
        fitnessHistory: [record, ...state.fitnessHistory.slice(0, 49)], // keep last 50
      };
    }

    case 'RESET_TO_DEFAULTS': {
      return INITIAL_STATE;
    }

    default:
      return state;
  }
}

// Storage migrations & validation
export function loadPersistedState(): AppState {
  if (typeof window === 'undefined') return INITIAL_STATE;

  try {
    const rawV2 = localStorage.getItem(APP_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<AppState>;
      if (parsed && parsed.version === CURRENT_SCHEMA_VERSION && Array.isArray(parsed.profiles)) {
        return {
          ...INITIAL_STATE,
          ...parsed,
          settings: { ...INITIAL_STATE.settings, ...(parsed.settings || {}) },
          match: { ...INITIAL_STATE.match, ...(parsed.match || {}) },
          trivia: { ...INITIAL_STATE.trivia, ...(parsed.trivia || {}) },
        };
      }
    }

    // Try migrating from v1 if present
    const rawV1Profiles = localStorage.getItem(V1_STORAGE_KEY);
    const rawV1ActiveId = localStorage.getItem(V1_ACTIVE_KEY);
    if (rawV1Profiles) {
      const v1Profiles = JSON.parse(rawV1Profiles) as FamilyProfile[];
      if (Array.isArray(v1Profiles) && v1Profiles.length > 0) {
        appLogger.info('Store', 'Migrating storage from v1 to v2');
        const migrated: AppState = {
          ...INITIAL_STATE,
          version: CURRENT_SCHEMA_VERSION,
          activeProfileId: rawV1ActiveId || v1Profiles[0].id || 'dad',
          profiles: v1Profiles,
        };
        savePersistedState(migrated);
        return migrated;
      }
    }
  } catch (err) {
    appLogger.warn('Store', 'Failed to load persisted state; falling back to initial state safely', {
      err: String(err),
    });
  }

  return INITIAL_STATE;
}

export function savePersistedState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    appLogger.error('Store', 'Failed to persist app state', { err: String(err) });
  }
}

// Selectors for memoized computation
export const selectActiveProfile = (state: AppState): FamilyProfile => {
  return state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0] || SEEDED_PROFILES[0];
};

export const selectProfileAccuracy = (state: AppState): number => {
  const acc = state.trivia.recentAccuracy;
  if (acc.length === 0) return 0.5; // neutral
  const correct = acc.filter(Boolean).length;
  return correct / acc.length;
};

export const selectTotalFitnessReps = (state: AppState, profileId?: string): number => {
  return state.fitnessHistory
    .filter((h) => !profileId || h.profileId === profileId)
    .reduce((sum, h) => sum + h.reps, 0);
};

// Context setup
interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const AppStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, undefined, loadPersistedState);

  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return React.createElement(StoreContext.Provider, { value }, children);
};

export function useAppStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return ctx;
}
