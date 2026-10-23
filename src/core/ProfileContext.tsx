import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  useAppStore,
  FamilyProfile,
  ExplainLevel,
  CommentaryTone,
  PreferredInput,
  SEEDED_PROFILES,
  selectActiveProfile,
} from './store';

export type { ExplainLevel, CommentaryTone, PreferredInput, FamilyProfile };
export { SEEDED_PROFILES };

interface ProfileContextType {
  profiles: FamilyProfile[];
  activeProfile: FamilyProfile;
  setActiveProfileId: (id: string) => void;
  updateProfileScore: (profileId: string, deltaPoints: number) => void;
  addBadgeToProfile: (profileId: string, badge: string) => void;
  incrementStreak: (profileId: string) => void;
  updateActiveLevel: (level: ExplainLevel) => void;
  updateActiveTone: (tone: CommentaryTone) => void;
  isSelectorOpen: boolean;
  setIsSelectorOpen: (open: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useAppStore();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const activeProfile = useMemo(() => selectActiveProfile(state), [state]);

  const setActiveProfileId = useCallback(
    (id: string) => {
      dispatch({ type: 'SET_ACTIVE_PROFILE', profileId: id });
    },
    [dispatch]
  );

  const updateProfileScore = useCallback(
    (profileId: string, deltaPoints: number) => {
      dispatch({ type: 'UPDATE_PROFILE_SCORE', profileId, deltaPoints });
    },
    [dispatch]
  );

  const addBadgeToProfile = useCallback(
    (profileId: string, badge: string) => {
      dispatch({ type: 'ADD_PROFILE_BADGE', profileId, badge });
    },
    [dispatch]
  );

  const incrementStreak = useCallback(
    (profileId: string) => {
      dispatch({ type: 'INCREMENT_PROFILE_STREAK', profileId });
    },
    [dispatch]
  );

  const updateActiveLevel = useCallback(
    (level: ExplainLevel) => {
      dispatch({ type: 'SET_PROFILE_LEVEL', profileId: activeProfile.id, level });
    },
    [dispatch, activeProfile.id]
  );

  const updateActiveTone = useCallback(
    (tone: CommentaryTone) => {
      dispatch({ type: 'SET_PROFILE_TONE', profileId: activeProfile.id, tone });
    },
    [dispatch, activeProfile.id]
  );

  const value = useMemo(
    () => ({
      profiles: state.profiles,
      activeProfile,
      setActiveProfileId,
      updateProfileScore,
      addBadgeToProfile,
      incrementStreak,
      updateActiveLevel,
      updateActiveTone,
      isSelectorOpen,
      setIsSelectorOpen,
    }),
    [
      state.profiles,
      activeProfile,
      setActiveProfileId,
      updateProfileScore,
      addBadgeToProfile,
      incrementStreak,
      updateActiveLevel,
      updateActiveTone,
      isSelectorOpen,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
