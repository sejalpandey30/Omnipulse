export type TabType = 'home' | 'sports' | 'fitness' | 'entertainment' | 'multimodal' | 'pulse';

export interface FocusableItem {
  id: string;
  tab?: TabType;
  group?: string;
  onSelect?: () => void;
  metadata?: Record<string, unknown>;
}

export interface PlayerStats {
  id: string;
  name: string;
  number: number;
  position: string;
  team: 'Home' | 'Away';
  speed: string;
  distance: string;
  heartRate: number;
  fatigueIndex: number;
  x: number; // percentage on field
  y: number; // percentage on field
}

export interface HighlightMoment {
  id: string;
  timestamp: string;
  title: string;
  category: 'Goal' | 'Save' | 'Tactical Counter' | 'VAR Review';
  aiConfidence: number;
  thumbnail: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  targetMuscle: string;
  targetReps: number;
  caloriesPerRep: number;
  guideInstruction: string;
}

export interface PoseLandmark {
  x: number;
  y: number;
  score: number;
}

export interface TriviaQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  funFact: string;
}
