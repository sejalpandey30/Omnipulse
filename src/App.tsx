import React, { useState, useEffect, Suspense, lazy } from 'react';
import { SpatialNavigationProvider, useSpatialNavigation } from './hooks/useSpatialNavigation';
import { ProfileProvider, useProfile } from './core/ProfileContext';
import { AppStoreProvider } from './core/store';
import { Focusable } from './components/common/Focusable';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { HomeDashboard } from './components/home/HomeDashboard';
import { ProfileSelectorModal } from './components/profile/ProfileSelectorModal';
import { DemoDirectorPanel } from './components/director/DemoDirectorPanel';
import { fusionController } from './core/fusionController';
import { matchEventBus } from './core/matchEventBus';
import { MATCH_EVENT_EXPLANATIONS } from './content/explanations';
import { TabType, TriviaQuestion } from './types';
import {
  Tv,
  Activity,
  Flame,
  Users,
  Command,
  Wifi,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  PieChart,
} from 'lucide-react';
import { tvAudio } from './utils/sound';

// Route-level code splitting
const AiSportsViewer = lazy(() =>
  import('./components/sports/AiSportsViewer').then((m) => ({ default: m.AiSportsViewer }))
);
const FitnessCoach = lazy(() =>
  import('./components/fitness/FitnessCoach').then((m) => ({ default: m.FitnessCoach }))
);
const FamilyTrivia = lazy(() =>
  import('./components/entertainment/FamilyTrivia').then((m) => ({ default: m.FamilyTrivia }))
);
const AirGestureController = lazy(() =>
  import('./components/multimodal/AirGestureController').then((m) => ({
    default: m.AirGestureController,
  }))
);
const FamilyPulse = lazy(() =>
  import('./components/pulse/FamilyPulse').then((m) => ({ default: m.FamilyPulse }))
);

// Preload helpers
export const preloadComponent = (tab: TabType) => {
  if (tab === 'sports') import('./components/sports/AiSportsViewer');
  if (tab === 'fitness') import('./components/fitness/FitnessCoach');
  if (tab === 'entertainment') import('./components/entertainment/FamilyTrivia');
  if (tab === 'multimodal') import('./components/multimodal/AirGestureController');
  if (tab === 'pulse') import('./components/pulse/FamilyPulse');
};

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [soundMuted, setSoundMuted] = useState(false);
  const [injectedTriviaQuestion, setInjectedTriviaQuestion] = useState<TriviaQuestion | null>(null);
  const [simulationModeActive, setSimulationModeActive] = useState(true);

  const { activeProfile, setIsSelectorOpen } = useProfile();
  const { pushBackHandler } = useSpatialNavigation();

  // Digital TV Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Back button handler: sub-screen to Home
  useEffect(() => {
    if (activeTab !== 'home') {
      const unregister = pushBackHandler(() => {
        setActiveTab('home');
        return true;
      });
      return () => unregister();
    }
  }, [activeTab, pushBackHandler]);

  // Subscribe to Multi-modal Fusion Commands
  useEffect(() => {
    const unsub = fusionController.subscribe((cmd) => {
      if (cmd.action === 'EXPLAIN') {
        setActiveTab('sports');
        const exp = MATCH_EVENT_EXPLANATIONS.OFFSIDE[activeProfile.commentaryTone];
        matchEventBus.publish({
          id: `fused-explain-${Date.now()}`,
          type: 'OFFSIDE',
          time: 68,
          players: ['K. Mbappé'],
          explanation: {
            kid: exp.kid,
            casual: exp.casual,
            expert: exp.expert,
          },
          tacticalData: {
            offsidePlayer: 'K. Mbappé',
            defendingLineX: 68,
            attackingPlayerX: 72,
            annotationType: 'OFFSIDE_LINE',
          },
        });
      } else if (cmd.action === 'FITNESS') {
        setActiveTab('fitness');
      } else if (cmd.action === 'TRIVIA') {
        setActiveTab('entertainment');
      } else if (cmd.action === 'SHOW_MY_TEAM') {
        setActiveTab('sports');
      } else if (cmd.action === 'NAVIGATE' && cmd.target) {
        if (['home', 'sports', 'fitness', 'entertainment', 'multimodal', 'pulse'].includes(cmd.target)) {
          setActiveTab(cmd.target as TabType);
        }
      }
    });

    return () => unsub();
  }, [activeProfile.commentaryTone]);

  const toggleSound = () => {
    const nextState = !soundMuted;
    setSoundMuted(nextState);
    tvAudio.setSoundEnabled(!nextState);
    if (!nextState) {
      tvAudio.playSelect();
    }
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home Hub', icon: <Tv className="w-5 h-5" /> },
    { id: 'sports', label: 'Sports AI', icon: <Activity className="w-5 h-5" /> },
    { id: 'fitness', label: 'Fitness Coach', icon: <Flame className="w-5 h-5" /> },
    { id: 'entertainment', label: 'Family Trivia', icon: <Users className="w-5 h-5" /> },
    { id: 'pulse', label: 'Family Pulse', icon: <PieChart className="w-5 h-5" /> },
    { id: 'multimodal', label: 'Air Gestures', icon: <Command className="w-5 h-5" /> },
  ];

  return (
    <div className="relative w-screen h-screen bg-tv-bg text-white overflow-hidden select-none font-sans flex flex-col justify-between p-6">
      {/* Background Ambient Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-tv-accent/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-tv-orange/10 blur-[140px] pointer-events-none" />

      {/* Top Header / App Bar */}
      <header className="flex items-center justify-between pb-4 border-b border-white/10 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-tv-accent to-tv-orange flex items-center justify-center shadow-lg shadow-tv-accent/20">
            <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>OmniPulse TV</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-tv-accent/20 text-tv-accent border border-tv-accent/30 font-bold uppercase">
                Coach Mode
              </span>
            </h1>
            <p className="text-xs text-slate-400">Living Room Multi-Modal AI Experience</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-2 bg-tv-surface/80 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
          {navItems.map((item) => (
            <Focusable
              key={item.id}
              id={`nav-${item.id}`}
              onSelect={() => {
                tvAudio.playSelect();
                setActiveTab(item.id);
              }}
              onMouseEnter={() => preloadComponent(item.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === item.id
                  ? 'bg-tv-card text-tv-accent border border-tv-accent/40 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Focusable>
          ))}
        </nav>

        {/* Right Corner Telemetry & Profile Chip */}
        <div className="flex items-center space-x-3">
          {/* Active Profile Avatar Button */}
          <Focusable
            id="nav-profile-chip"
            onSelect={() => {
              tvAudio.playSelect();
              setIsSelectorOpen(true);
            }}
            className="flex items-center space-x-2 bg-tv-surface/80 hover:bg-tv-card border border-white/10 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md cursor-pointer"
          >
            <span className="text-base">{activeProfile.avatar}</span>
            <div className="text-left">
              <span className="text-white font-bold block leading-none">{activeProfile.name}</span>
              <span className="text-[10px] text-tv-accent uppercase font-mono block leading-none mt-0.5">
                {activeProfile.explainLevel}
              </span>
            </div>
          </Focusable>

          <Focusable
            id="btn-sound-toggle"
            onSelect={toggleSound}
            className="p-2.5 rounded-xl bg-tv-surface/80 border border-white/10 text-slate-300 hover:text-white"
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-tv-accent" />}
          </Focusable>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-tv-surface/80 px-3 py-2 rounded-xl border border-white/10">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px]">Fire OS 8</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-white bg-tv-surface/80 px-3 py-2 rounded-xl border border-white/10 font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-tv-accent" />
            <span>{currentTime}</span>
          </div>
        </div>
      </header>

      {/* Main Screen Content View with Suspense & Error Boundaries */}
      <main className="flex-1 overflow-hidden my-4 relative z-0">
        <ErrorBoundary moduleName={activeTab}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center space-x-3 bg-tv-card/80 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-md">
                  <div className="w-5 h-5 border-2 border-tv-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-semibold text-white">Loading View...</span>
                </div>
              </div>
            }
          >
            {activeTab === 'home' && (
              <HomeDashboard
                onLaunchModule={(tab) => {
                  tvAudio.playSelect();
                  setActiveTab(tab);
                }}
              />
            )}

            {activeTab === 'sports' && (
              <AiSportsViewer
                onNavigateToTrivia={(quiz) => {
                  if (quiz) setInjectedTriviaQuestion(quiz);
                  setActiveTab('entertainment');
                }}
                onNavigateToFitness={() => setActiveTab('fitness')}
              />
            )}

            {activeTab === 'fitness' && (
              <FitnessCoach onExit={() => setActiveTab('home')} />
            )}

            {activeTab === 'entertainment' && (
              <FamilyTrivia injectedQuestion={injectedTriviaQuestion} />
            )}

            {activeTab === 'pulse' && <FamilyPulse />}

            {activeTab === 'multimodal' && (
              <AirGestureController onCommandTriggered={(cmd) => setActiveTab(cmd as TabType)} />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Bottom Remote Control Status Bar */}
      <footer className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10 z-10">
        <div className="flex items-center space-x-6">
          <span className="flex items-center space-x-1.5">
            <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/20">
              D-Pad
            </kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/20">
              Select
            </kbd>
            <span>Confirm / Trigger</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/20">
              Back / Esc
            </kbd>
            <span>Return to Home</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/20">
              Shift + D
            </kbd>
            <span>Demo Director</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-tv-accent font-mono text-[11px] font-bold">OmniPulse TV Engine v2.0</span>
        </div>
      </footer>

      {/* Who's Watching? Profile Switcher Modal */}
      <ProfileSelectorModal />

      {/* Demo Director Shift+D Hidden Panel */}
      <DemoDirectorPanel
        onSimulateVoiceCommand={(cmd) => {
          if (cmd.includes('sport')) setActiveTab('sports');
          else if (cmd.includes('fitness')) setActiveTab('fitness');
          else if (cmd.includes('trivia')) setActiveTab('entertainment');
          else if (cmd.includes('pulse')) setActiveTab('pulse');
        }}
        onToggleSimulationMode={() => setSimulationModeActive((prev) => !prev)}
        simulationModeActive={simulationModeActive}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppStoreProvider>
      <ProfileProvider>
        <SpatialNavigationProvider defaultFocusId="nav-home">
          <AppContent />
        </SpatialNavigationProvider>
      </ProfileProvider>
    </AppStoreProvider>
  );
};

export default App;
