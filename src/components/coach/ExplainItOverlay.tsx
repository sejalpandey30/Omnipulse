import React, { useState, useEffect } from 'react';
import { MatchEvent } from '../../core/matchEventBus';
import { useProfile } from '../../core/ProfileContext';
import { getExplanationText } from '../../content/explanations';
import { Focusable } from '../common/Focusable';
import { HelpCircle, ThumbsUp, ThumbsDown, X, Volume2, Sparkles, CheckCircle2 } from 'lucide-react';
import { tvAudio } from '../../utils/sound';

interface ExplainItOverlayProps {
  event: MatchEvent | null;
  onDismiss: () => void;
  onLaunchQuizFromEvent?: (event: MatchEvent) => void;
}

export const ExplainItOverlay: React.FC<ExplainItOverlayProps> = ({
  event,
  onDismiss,
  onLaunchQuizFromEvent,
}) => {
  const { activeProfile, updateProfileScore } = useProfile();
  const [familyVote, setFamilyVote] = useState<'AGREE' | 'DISAGREE' | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (event) {
      setFamilyVote(null);
      setHasVoted(false);
      tvAudio.playFocus();
    }
  }, [event]);

  if (!event) return null;

  const explanation = getExplanationText(
    event.type,
    activeProfile.explainLevel,
    activeProfile.commentaryTone
  );

  const handleVote = (vote: 'AGREE' | 'DISAGREE') => {
    setFamilyVote(vote);
    setHasVoted(true);
    tvAudio.playSelect();
    updateProfileScore(activeProfile.id, 25);
  };

  const isKid = activeProfile.explainLevel === 'kid';

  return (
    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col justify-between p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Top Banner & Active Profile Voice Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 bg-tv-card/90 border border-tv-accent/40 px-4 py-2 rounded-2xl backdrop-blur-md">
          <div className="p-1.5 bg-tv-accent/20 rounded-xl text-tv-accent">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase text-tv-accent tracking-wider">
                Explain-It Sports AI
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                Level: {activeProfile.explainLevel.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Co-commentary tailored for <strong className="text-white">{activeProfile.name}</strong> ({activeProfile.commentaryTone} tone)
            </p>
          </div>
        </div>

        <Focusable
          id="explain-close-btn"
          onSelect={onDismiss}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          <X className="w-5 h-5" />
        </Focusable>
      </div>

      {/* Center Tactical HUD Overlay Indicators */}
      <div className="relative flex-1 flex items-center justify-center pointer-events-none">
        {event.type === 'OFFSIDE' && (
          <div className="absolute inset-x-12 flex flex-col items-center">
            <div className="w-72 h-44 border-2 border-dashed border-red-500 bg-red-500/10 rounded-2xl flex flex-col items-center justify-center p-3">
              <span className="text-xs font-black text-red-400 bg-red-950/80 px-3 py-1 rounded-full border border-red-500/40">
                OFFSIDE TRAP DETECTED
              </span>
              <p className="text-[11px] text-white font-semibold mt-1">Mbappé: 14 cm beyond second defender</p>
            </div>
          </div>
        )}

        {event.type === 'FOUL' && (
          <div className="w-60 h-60 border-4 border-amber-400 rounded-full flex items-center justify-center animate-pulse bg-amber-400/10">
            <span className="text-xs font-black text-amber-300 bg-slate-950/90 px-3 py-1.5 rounded-full border border-amber-400">
              CONTACT IMPACT ZONE
            </span>
          </div>
        )}

        {event.type === 'VAR_CHECK' && (
          <div className="border-4 border-tv-accent w-80 h-48 bg-tv-accent/10 rounded-2xl flex flex-col items-center justify-center p-4">
            <span className="text-xs font-black text-tv-accent bg-slate-950/90 px-4 py-1.5 rounded-full border border-tv-accent">
              VAR PARALLAX SYNC ACTIVE
            </span>
            <p className="text-xs text-slate-200 mt-2 text-center">Calibrating pitch telemetry sensors...</p>
          </div>
        )}

        {event.type === 'GOAL' && (
          <div className="text-center animate-bounce">
            <span className="text-4xl font-black text-tv-orange drop-shadow-[0_0_25px_rgba(255,153,0,0.8)]">
              ⚽ GOAL CONFIRMED!
            </span>
          </div>
        )}
      </div>

      {/* Bottom Explanation Card + Family Decision Voting */}
      <div className="bg-tv-card/95 border-2 border-tv-accent/50 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-tv-accent text-slate-950 font-black text-xs uppercase tracking-wider">
                {event.type}
              </span>
              <span className="text-xs font-bold text-slate-400">Match Minute {event.time}&apos;</span>
            </div>
            <p className={`text-white font-bold leading-relaxed ${isKid ? 'text-lg text-tv-highlight' : 'text-base'}`}>
              &ldquo;{explanation}&rdquo;
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start">
            <span className="p-2 rounded-xl bg-white/5 text-tv-accent">
              <Volume2 className="w-5 h-5" />
            </span>
          </div>
        </div>

        {/* Family Interactive Vote */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-300 font-semibold flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4 text-tv-orange" />
              <span>Family Vote: Was that the right call?</span>
            </span>
            <div className="flex space-x-2">
              <Focusable
                id="vote-agree-btn"
                onSelect={() => handleVote('AGREE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border ${
                  familyVote === 'AGREE'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-tv-surface hover:bg-emerald-500/20 text-slate-300 border-white/10'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Right Call (+25 pts)</span>
              </Focusable>
              <Focusable
                id="vote-disagree-btn"
                onSelect={() => handleVote('DISAGREE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border ${
                  familyVote === 'DISAGREE'
                    ? 'bg-red-500 text-white border-red-400'
                    : 'bg-tv-surface hover:bg-red-500/20 text-slate-300 border-white/10'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>Bad Call (+25 pts)</span>
              </Focusable>
            </div>
            {hasVoted && (
              <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Vote recorded for {activeProfile.name}!</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {onLaunchQuizFromEvent && (
              <Focusable
                id="explain-quiz-btn"
                onSelect={() => onLaunchQuizFromEvent(event)}
                className="bg-tv-accent text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-tv-accent/90"
              >
                Take Family Rule Quiz 🏆
              </Focusable>
            )}
            <Focusable
              id="explain-resume-btn"
              onSelect={onDismiss}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              Resume Stream ▶
            </Focusable>
          </div>
        </div>
      </div>
    </div>
  );
};
