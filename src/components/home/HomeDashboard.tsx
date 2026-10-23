import React from 'react';
import { Focusable } from '../common/Focusable';
import { Play, Dumbbell, Users, Activity, Sparkles, ChevronRight, Zap, Shield, Flame } from 'lucide-react';
import { TabType } from '../../types';

interface HomeDashboardProps {
  onNavigate?: (tab: TabType) => void;
  onLaunchModule?: (tab: TabType) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigate, onLaunchModule }) => {
  const handleNav = (tab: TabType) => {
    if (onLaunchModule) onLaunchModule(tab);
    else if (onNavigate) onNavigate(tab);
  };
  return (
    <div className="flex flex-col space-y-6 overflow-y-auto no-scrollbar pb-8">
      {/* Hero Featured Card: Live AI-Enhanced Champions League Match */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-tv-card bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-8 min-h-[320px] flex flex-col justify-between">
        {/* Background Decorative Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-tv-accent/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-tv-orange/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center space-x-3 mb-3">
            <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span>LIVE AI STREAM</span>
            </span>
            <span className="text-xs font-bold text-tv-accent bg-tv-accent/15 border border-tv-accent/30 px-3 py-1 rounded-full">
              4K Tactical Vision Active
            </span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-black text-white max-w-xl leading-tight mb-2">
            UEFA Champions League: Real Madrid vs Man City
          </h1>
          <p className="text-slate-300 text-sm max-w-lg leading-relaxed">
            Experience next-generation AI sports viewing with real-time player telemetry, 35 km/h sprint metrics, automated offside lines, and live win probabilities.
          </p>
        </div>

        <div className="flex items-center space-x-4 pt-4">
          <Focusable
            id="hero-watch-live"
            autoFocus
            onSelect={() => handleNav('sports')}
            className="flex items-center space-x-3 bg-tv-accent hover:bg-tv-accent/90 text-slate-950 px-6 py-3.5 rounded-2xl font-bold shadow-tv-glow"
          >
            <Play className="w-5 h-5 fill-current" />
            <span className="text-sm">Launch Coach Mode (Match-Day)</span>
          </Focusable>

          <Focusable
            id="hero-start-workout"
            onSelect={() => handleNav('fitness')}
            className="flex items-center space-x-3 bg-tv-surface hover:bg-white/10 text-white border border-white/10 px-6 py-3.5 rounded-2xl font-bold"
          >
            <Dumbbell className="w-5 h-5 text-tv-orange" />
            <span className="text-sm">Living Room Workout</span>
          </Focusable>

          <Focusable
            id="hero-family-pulse"
            onSelect={() => handleNav('pulse')}
            className="flex items-center space-x-3 bg-tv-surface hover:bg-white/10 text-white border border-white/10 px-5 py-3.5 rounded-2xl font-bold"
          >
            <Sparkles className="w-5 h-5 text-tv-accent" />
            <span className="text-sm">Family Pulse Recap</span>
          </Focusable>
        </div>
      </div>

      {/* Categories Row: Instant Access Tiles */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-tv-accent" />
            <span>Interactive Living Room Experiences</span>
          </h2>
          <span className="text-xs text-slate-400">Navigate with D-Pad Arrows</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {/* Tile 1: AI Sports */}
          <Focusable
            id="tile-sports"
            onSelect={() => handleNav('sports')}
            className="bg-tv-card/85 border border-white/10 p-5 rounded-2xl group hover:border-tv-accent/50 flex flex-col justify-between min-h-[170px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-tv-accent/20 rounded-xl text-tv-accent group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md">
                  60 FPS
                </span>
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-tv-accent transition-colors">
                Coach Mode (Match AI)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Live AI co-commentator, offside explanations, and tactical telemetry.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-tv-accent mt-3">
              <span>Enter Match</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Focusable>

          {/* Tile 2: AI Fitness */}
          <Focusable
            id="tile-fitness"
            onSelect={() => handleNav('fitness')}
            className="bg-tv-card/85 border border-white/10 p-5 rounded-2xl group hover:border-tv-orange/50 flex flex-col justify-between min-h-[170px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-tv-orange/20 rounded-xl text-tv-orange group-hover:scale-110 transition-transform">
                  <Flame className="w-6 h-6" />
                </div>
                <span className="text-[11px] bg-tv-orange/20 text-tv-orange font-bold px-2 py-0.5 rounded-md">
                  CV Pose
                </span>
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-tv-orange transition-colors">
                AI Fitness Coach
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Computer vision joint tracking, rep counts, and biomechanical feedback.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-tv-orange mt-3">
              <span>Start Workout</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Focusable>

          {/* Tile 3: Family Trivia */}
          <Focusable
            id="tile-entertainment"
            onSelect={() => handleNav('entertainment')}
            className="bg-tv-card/85 border border-white/10 p-5 rounded-2xl group hover:border-purple-500/50 flex flex-col justify-between min-h-[170px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-[11px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-md">
                  Multiplayer
                </span>
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-purple-400 transition-colors">
                Family Trivia Arena
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Synchronized sports & film quizzes with dual team buzzers.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-purple-400 mt-3">
              <span>Play Quiz</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Focusable>

          {/* Tile 4: Multi-Modal Gestures */}
          <Focusable
            id="tile-multimodal"
            onSelect={() => handleNav('multimodal')}
            className="bg-tv-card/85 border border-white/10 p-5 rounded-2xl group hover:border-tv-focus/50 flex flex-col justify-between min-h-[170px]"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-tv-focus/20 rounded-xl text-tv-focus group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="text-[11px] bg-tv-focus/20 text-tv-focus font-bold px-2 py-0.5 rounded-md">
                  Voice + Gesture
                </span>
              </div>
              <h3 className="font-bold text-white text-base group-hover:text-tv-focus transition-colors">
                Air Gestures & Voice
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Hands-free control for snacking or working out without touching remote.
              </p>
            </div>
            <div className="flex items-center text-xs font-bold text-tv-focus mt-3">
              <span>Test Gestures</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Focusable>
        </div>
      </div>

      {/* Platform & System Specs Information Footer */}
      <div className="bg-tv-card/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          <Shield className="w-4 h-4 text-tv-accent" />
          <span>Universal OS Architecture: Fire OS 7/8 (Android Leanback API) & Vega OS (Linux WebKit/React Native)</span>
        </div>
        <div className="flex items-center space-x-4 font-mono text-[11px]">
          <span>D-PAD: ⬆ ⬇ ⬅ ➡</span>
          <span>SELECT: [ENTER]</span>
          <span>BACK: [ESC]</span>
        </div>
      </div>
    </div>
  );
};
