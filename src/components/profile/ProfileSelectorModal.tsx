import React from 'react';
import { useProfile } from '../../core/ProfileContext';
import { Focusable } from '../common/Focusable';
import { Users, X, Check, Award, Flame } from 'lucide-react';
import { tvAudio } from '../../utils/sound';

export const ProfileSelectorModal: React.FC = () => {
  const { profiles, activeProfile, setActiveProfileId, isSelectorOpen, setIsSelectorOpen } = useProfile();

  if (!isSelectorOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-tv-card border border-white/15 rounded-3xl max-w-3xl w-full p-8 shadow-2xl relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-tv-accent/20 rounded-2xl text-tv-accent border border-tv-accent/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Who&apos;s Watching?</h2>
              <p className="text-xs text-slate-400">Select your profile to customize AI commentary &amp; voice controls</p>
            </div>
          </div>
          <Focusable
            id="profile-close-btn"
            onSelect={() => {
              tvAudio.playSelect();
              setIsSelectorOpen(false);
            }}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </Focusable>
        </div>

        {/* Profiles Grid - D-pad navigable */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {profiles.map((profile) => {
            const isActive = profile.id === activeProfile.id;
            return (
              <Focusable
                key={profile.id}
                id={`profile-card-${profile.id}`}
                onSelect={() => {
                  tvAudio.playSelect();
                  setActiveProfileId(profile.id);
                }}
                className={`p-5 rounded-2xl border flex flex-col items-center text-center transition-all ${
                  isActive
                    ? 'bg-tv-accent/20 border-tv-accent shadow-tv-focus ring-2 ring-tv-accent'
                    : 'bg-tv-surface/80 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl mb-3 shadow-inner">
                  {profile.avatar}
                </div>
                <h3 className="font-bold text-white text-sm mb-1 flex items-center space-x-1">
                  <span>{profile.name}</span>
                  {isActive && <Check className="w-4 h-4 text-tv-accent" />}
                </h3>

                <div className="flex items-center space-x-1 text-[11px] text-tv-orange font-bold mb-1">
                  <Flame className="w-3 h-3" />
                  <span>{profile.score} pts</span>
                </div>

                <div className="flex items-center space-x-1 text-[10px] text-slate-400 mb-2">
                  <Award className="w-3 h-3 text-tv-accent" />
                  <span>{profile.streak} day streak</span>
                </div>

                <div className="w-full pt-2 border-t border-white/10 flex flex-col items-center space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 text-slate-300">
                    {profile.explainLevel} level
                  </span>
                  <span className="text-[10px] text-tv-accent font-semibold">
                    {profile.commentaryTone} tone
                  </span>
                </div>
              </Focusable>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-slate-400">
          <span>Use remote arrow keys to choose, then press Select.</span>
          <span className="text-tv-accent font-mono text-[11px]">D-PAD: ⬅ ➡ SELECT: [ENTER]</span>
        </div>
      </div>
    </div>
  );
};
