import React from 'react';
import { useProfile } from '../../core/ProfileContext';
import { Focusable } from '../common/Focusable';
import { Trophy, Award, Flame, Users, Activity, Dumbbell, Shield, CheckCircle2, ChevronRight } from 'lucide-react';
import { tvAudio } from '../../utils/sound';

interface FamilyPulseProps {
  onBackToMatch?: () => void;
}

export const FamilyPulse: React.FC<FamilyPulseProps> = ({ onBackToMatch }) => {
  const { profiles, activeProfile, setActiveProfileId } = useProfile();

  const totalPoints = profiles.reduce((acc, p) => acc + p.score, 0);
  const totalBadges = profiles.reduce((acc, p) => acc + p.badges.length, 0);
  const topStreak = Math.max(...profiles.map((p) => p.streak));

  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto no-scrollbar pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-tv-card/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-tv-accent/20 rounded-xl text-tv-accent border border-tv-accent/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Family Pulse Weekly Match Recap</span>
              <span className="text-xs bg-tv-orange/20 text-tv-orange px-2 py-0.5 rounded-full font-bold">
                Synced Family Hub
              </span>
            </h2>
            <p className="text-xs text-slate-400">Aggregated fitness reps, tactical rules learned, and quiz victories</p>
          </div>
        </div>

        {onBackToMatch && (
          <Focusable
            id="pulse-btn-back"
            onSelect={onBackToMatch}
            className="bg-tv-accent text-slate-950 px-4 py-2 rounded-xl text-xs font-bold hover:bg-tv-accent/90"
          >
            Back to Match Feed ▶
          </Focusable>
        )}
      </div>

      {/* Aggregate Family Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-tv-card/75 border border-white/10 p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-tv-accent/20 text-tv-accent">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Family Score</span>
            <p className="text-2xl font-black text-white">{totalPoints} pts</p>
          </div>
        </div>

        <div className="bg-tv-card/75 border border-white/10 p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-tv-orange/20 text-tv-orange">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Matchday Reps</span>
            <p className="text-2xl font-black text-tv-orange">148 Reps</p>
          </div>
        </div>

        <div className="bg-tv-card/75 border border-white/10 p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Rules Mastered</span>
            <p className="text-2xl font-black text-purple-300">6 Rules</p>
          </div>
        </div>

        <div className="bg-tv-card/75 border border-white/10 p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Max Streak</span>
            <p className="text-2xl font-black text-emerald-400">{topStreak} Days</p>
          </div>
        </div>
      </div>

      {/* Leaderboard Table & Badges Showcase */}
      <div className="grid grid-cols-12 gap-4 flex-1">
        {/* Left 8 cols: Family Member Cards */}
        <div className="col-span-8 bg-tv-card/75 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
              <Users className="w-4 h-4 text-tv-accent" />
              <span>Family Member Standings</span>
            </h3>

            <div className="space-y-2.5">
              {profiles
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((profile, idx) => {
                  const isActive = profile.id === activeProfile.id;
                  return (
                    <Focusable
                      key={profile.id}
                      id={`pulse-member-${profile.id}`}
                      onSelect={() => {
                        tvAudio.playSelect();
                        setActiveProfileId(profile.id);
                      }}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-tv-accent/20 border-tv-accent shadow-tv-focus'
                          : 'bg-tv-surface border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 text-center font-black text-sm text-slate-500">#{idx + 1}</span>
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                          {profile.avatar}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-white text-sm">{profile.name}</p>
                            {isActive && (
                              <span className="text-[10px] bg-tv-accent text-slate-950 font-bold px-1.5 py-0.5 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {profile.favoriteTeam} • {profile.explainLevel} commentary • {profile.commentaryTone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-1.5">
                          {profile.badges.slice(0, 2).map((badge, bIdx) => (
                            <span
                              key={bIdx}
                              className="text-[10px] bg-white/10 text-tv-accent px-2 py-0.5 rounded-md font-semibold"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                        <div className="text-right min-w-[70px]">
                          <span className="text-xs text-tv-orange font-black text-base">{profile.score} pts</span>
                        </div>
                      </div>
                    </Focusable>
                  );
                })}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Select any family member with D-pad to switch active viewer.</span>
            <span className="text-tv-accent font-semibold">Total family badges: {totalBadges}</span>
          </div>
        </div>

        {/* Right 4 cols: Tactical Rules Mastered Showcase */}
        <div className="col-span-4 bg-tv-card/75 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-tv-orange mb-3 flex items-center space-x-2">
              <Award className="w-4 h-4" />
              <span>Rules Learned by Family</span>
            </h3>

            <div className="space-y-2.5">
              {[
                { name: 'Rule 11: Offside Trap', level: 'Mastered', desc: 'Second-last defender position & timing' },
                { name: 'Law 12: Tactical Fouls', level: 'Mastered', desc: 'Careless vs reckless transition stops' },
                { name: 'VAR Protocol', level: 'Proficient', desc: 'Clear and obvious error threshold' },
                { name: 'Goal Line Technology', level: 'Mastered', desc: '100% ball circumference over line' },
              ].map((rule, idx) => (
                <div key={idx} className="bg-tv-surface p-3 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{rule.name}</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                      {rule.level}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{rule.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 text-[11px] text-slate-400 text-center">
            🏆 New rule quiz unlocked after every explained event!
          </div>
        </div>
      </div>
    </div>
  );
};
