import React, { useState } from 'react';
import { useProfile } from '../../core/ProfileContext';
import { FitnessCoach } from '../fitness/FitnessCoach';
import { Focusable } from '../common/Focusable';
import { Trophy, Flame, RotateCcw, CheckCircle, ArrowRight } from 'lucide-react';
import { tvAudio } from '../../utils/sound';
import confetti from 'canvas-confetti';

interface HalftimeChallengeProps {
  onComplete: () => void;
  reason?: 'HALFTIME' | 'LULL';
}

export const HalftimeChallenge: React.FC<HalftimeChallengeProps> = ({ onComplete, reason = 'HALFTIME' }) => {
  const { activeProfile, updateProfileScore, addBadgeToProfile } = useProfile();
  const [completed, setCompleted] = useState(false);
  const [finalReps, setFinalReps] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const handleChallengeFinished = (reps: number) => {
    const points = Math.max(50, reps * 20);
    setFinalReps(reps);
    setEarnedPoints(points);
    setCompleted(true);

    updateProfileScore(activeProfile.id, points);
    if (reps >= 8) {
      addBadgeToProfile(activeProfile.id, 'Halftime Hero');
    }

    tvAudio.playCheer();
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#FF9900', '#00A8E1', '#10B981', '#FFFFFF'],
    });
  };

  if (completed) {
    return (
      <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-tv-card border-2 border-tv-orange/50 rounded-3xl max-w-xl w-full p-8 text-center shadow-2xl flex flex-col items-center">
          <div className="p-5 bg-tv-orange/20 rounded-full text-tv-orange mb-4 border border-tv-orange/40 animate-bounce">
            <Trophy className="w-16 h-16" />
          </div>

          <h2 className="text-3xl font-black text-white mb-1">Challenge Completed!</h2>
          <p className="text-sm text-slate-300 mb-6">
            Great hustle, <strong className="text-tv-accent">{activeProfile.name}</strong>! You turned quiet match time into family fitness points!
          </p>

          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="bg-tv-surface p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Reps Completed</span>
              <p className="text-3xl font-black text-white">{finalReps}</p>
            </div>
            <div className="bg-tv-surface p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Points Credited</span>
              <p className="text-3xl font-black text-tv-orange">+{earnedPoints} pts</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold mb-6">
            <CheckCircle className="w-4 h-4" />
            <span>Credited to {activeProfile.name}&apos;s profile score! Badge: &quot;Halftime Hero&quot;</span>
          </div>

          <div className="flex items-center space-x-4 w-full justify-center">
            <Focusable
              id="halftime-btn-return"
              onSelect={onComplete}
              className="flex items-center space-x-2 bg-tv-accent hover:bg-tv-accent/90 text-slate-950 font-bold px-6 py-3 rounded-2xl text-sm shadow-tv-glow"
            >
              <span>Return to Live Match</span>
              <ArrowRight className="w-4 h-4" />
            </Focusable>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-tv-bg flex flex-col p-6 animate-in fade-in duration-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-tv-orange/20 text-tv-orange border border-tv-orange/30 font-black text-xs uppercase">
            {reason === 'HALFTIME' ? 'HALFTIME BREAK' : 'MATCH LULL CHALLENGE'}
          </span>
          <span className="text-xs text-slate-400">
            Active athlete: <strong className="text-white">{activeProfile.name}</strong>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <FitnessCoach
          challengeMode={true}
          timeLimitSeconds={30}
          initialExercise="Squats"
          onChallengeComplete={handleChallengeFinished}
          onExit={onComplete}
        />
      </div>
    </div>
  );
};
