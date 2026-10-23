import React, { useState, useEffect } from 'react';
import { matchEventBus, MatchEventType, BusDebugTraceEntry } from '../../core/matchEventBus';
import { useProfile } from '../../core/ProfileContext';
import { MATCH_EVENT_EXPLANATIONS } from '../../content/explanations';
import { Focusable } from '../common/Focusable';
import { Sparkles, X, Play, RefreshCw, Mic, Volume2, Activity, Terminal, ListChecks, PlayCircle } from 'lucide-react';
import { tvAudio } from '../../utils/sound';
import { fusionController } from '../../core/fusionController';
import { appLogger, LogEntry } from '../../core/logger';
import { useAppStore } from '../../core/store';

interface DemoDirectorPanelProps {
  onSimulateVoiceCommand?: (cmd: string) => void;
  onToggleSimulationMode?: () => void;
  simulationModeActive?: boolean;
}

export const DemoDirectorPanel: React.FC<DemoDirectorPanelProps> = ({
  onSimulateVoiceCommand,
  onToggleSimulationMode,
  simulationModeActive = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [typedCommand, setTypedCommand] = useState('');
  const [activeTab, setActiveTab] = useState<'triggers' | 'replay' | 'trace' | 'logs'>('triggers');
  const [traces, setTraces] = useState<BusDebugTraceEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [perfFps, setPerfFps] = useState(60);

  const { state: appStoreState, dispatch } = useAppStore();
  const { profiles, activeProfile, setActiveProfileId, updateActiveLevel, updateActiveTone } = useProfile();

  // Shift+D shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        tvAudio.playFocus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subscribe to traces and logs when open
  useEffect(() => {
    if (!isOpen) return;
    setTraces(matchEventBus.getTrace());
    setLogs(appLogger.getEntries());

    const unsubTrace = matchEventBus.subscribeTrace((entry) => {
      setTraces((prev) => [entry, ...prev.slice(0, 49)]);
    });

    const unsubLog = appLogger.subscribe((entry) => {
      setLogs((prev) => [entry, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubTrace();
      unsubLog();
    };
  }, [isOpen]);

  // FPS calculation
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const measure = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        setPerfFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measure);
    };

    animId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animId);
  }, []);

  const fireEvent = (type: MatchEventType) => {
    tvAudio.playSelect();
    const explanationSet = MATCH_EVENT_EXPLANATIONS[type] || MATCH_EVENT_EXPLANATIONS.OFFSIDE;
    const toneSet = explanationSet[activeProfile.commentaryTone] || explanationSet.hype;

    matchEventBus.publish({
      id: `evt-${Date.now()}-${type.toLowerCase()}`,
      type,
      time: Math.floor(Math.random() * 85) + 5,
      players: ['K. Mbappé', 'Vinícius Jr.'],
      explanation: {
        kid: toneSet.kid,
        casual: toneSet.casual,
        expert: toneSet.expert,
      },
      tacticalData: {
        offsidePlayer: 'K. Mbappé',
        foulCommittedBy: 'Rodri',
        goalScorer: 'Vinícius Jr.',
        defendingLineX: 68,
        attackingPlayerX: 72,
        annotationType:
          type === 'OFFSIDE'
            ? 'OFFSIDE_LINE'
            : type === 'FOUL'
            ? 'FOUL_CIRCLE'
            : type === 'GOAL'
            ? 'GOAL_TRAJECTORY'
            : 'VAR_BOX',
      },
    });
  };

  const handleRunReplay = () => {
    tvAudio.playSelect();
    const toneSet = MATCH_EVENT_EXPLANATIONS.GOAL.hype;
    const offsideTone = MATCH_EVENT_EXPLANATIONS.OFFSIDE.hype;

    const sequence = [
      {
        delayMs: 300,
        event: {
          id: `replay-offside-${Date.now()}`,
          type: 'OFFSIDE' as MatchEventType,
          time: 64,
          players: ['K. Mbappé'],
          explanation: offsideTone,
          tacticalData: {
            offsidePlayer: 'K. Mbappé',
            defendingLineX: 68,
            attackingPlayerX: 72,
            annotationType: 'OFFSIDE_LINE' as const,
          },
        },
      },
      {
        delayMs: 4000,
        event: {
          id: `replay-goal-${Date.now()}`,
          type: 'GOAL' as MatchEventType,
          time: 71,
          players: ['Vinícius Jr.'],
          explanation: toneSet,
          tacticalData: {
            goalScorer: 'Vinícius Jr.',
            annotationType: 'GOAL_TRAJECTORY' as const,
          },
        },
      },
    ];

    matchEventBus.replaySequence(sequence, () => {
      appLogger.info('Director', 'Deterministic replay sequence finished');
    });
  };

  const handleSimulateTypedVoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedCommand.trim()) return;
    tvAudio.playSelect();
    fusionController.onVoiceRecognized(typedCommand);
    onSimulateVoiceCommand?.(typedCommand);
    setTypedCommand('');
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-3 right-3 z-40 opacity-75 hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-tv-card/90 hover:bg-tv-accent hover:text-slate-950 text-white border border-white/20 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-1.5 shadow-lg backdrop-blur-md"
        >
          <Sparkles className="w-3.5 h-3.5 text-tv-orange" />
          <span>Demo Director [Shift+D]</span>
          {appStoreState.settings.perfOverlay && (
            <span className="ml-1 text-[10px] text-emerald-400 font-bold">{perfFps} FPS</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] z-50 bg-tv-card/95 border-l border-white/20 backdrop-blur-xl p-5 shadow-2xl flex flex-col justify-between overflow-y-auto no-scrollbar">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-tv-orange/20 text-tv-orange rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-white text-sm">Demo Director &amp; Observability</h3>
              <p className="text-[10px] text-slate-400">FPS: {perfFps} • Buffer: {traces.length} traces</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 rounded-xl border border-white/5 mb-4 text-[11px] font-semibold text-slate-300">
          <button
            onClick={() => setActiveTab('triggers')}
            className={`py-1 rounded-lg ${activeTab === 'triggers' ? 'bg-tv-accent text-slate-950 font-bold' : ''}`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('replay')}
            className={`py-1 rounded-lg ${activeTab === 'replay' ? 'bg-tv-accent text-slate-950 font-bold' : ''}`}
          >
            Replay
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            className={`py-1 rounded-lg ${activeTab === 'trace' ? 'bg-tv-accent text-slate-950 font-bold' : ''}`}
          >
            Trace
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-1 rounded-lg ${activeTab === 'logs' ? 'bg-tv-accent text-slate-950 font-bold' : ''}`}
          >
            Logs
          </button>
        </div>

        {activeTab === 'triggers' && (
          <div className="space-y-4">
            {/* Event Triggers */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">
                Trigger Match-Day Events
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fireEvent('OFFSIDE')}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-tv-accent hover:text-slate-950 border border-white/10 text-white text-xs font-semibold flex items-center justify-between"
                >
                  <span>Offside VAR</span>
                  <span className="text-[10px] opacity-70">P45</span>
                </button>
                <button
                  onClick={() => fireEvent('FOUL')}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-tv-accent hover:text-slate-950 border border-white/10 text-white text-xs font-semibold flex items-center justify-between"
                >
                  <span>Tactical Foul</span>
                  <span className="text-[10px] opacity-70">P50</span>
                </button>
                <button
                  onClick={() => fireEvent('GOAL')}
                  className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between"
                >
                  <span>⚽ Goal Screamer</span>
                  <span className="text-[10px] opacity-70">P100</span>
                </button>
                <button
                  onClick={() => fireEvent('HALFTIME')}
                  className="p-2.5 rounded-xl bg-tv-orange/20 hover:bg-tv-orange hover:text-slate-950 border border-tv-orange/30 text-tv-orange text-xs font-bold flex items-center justify-between"
                >
                  <span>⚡ Halftime 30s</span>
                  <span className="text-[10px] opacity-70">P70</span>
                </button>
              </div>
            </div>

            {/* Voice Command Simulation Box */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 font-mono">
                Typed Voice &amp; Intent Box
              </span>
              <form onSubmit={handleSimulateTypedVoice} className="flex space-x-1.5">
                <input
                  type="text"
                  value={typedCommand}
                  onChange={(e) => setTypedCommand(e.target.value)}
                  placeholder='e.g. "explain that", "pause", "show my team"'
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-tv-accent"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-tv-accent text-slate-950 font-bold text-xs"
                >
                  Send
                </button>
              </form>
            </div>

            {/* Switch Active Profile */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">
                Active Family Profile
              </span>
              <div className="grid grid-cols-2 gap-2">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      tvAudio.playFocus();
                      setActiveProfileId(p.id);
                    }}
                    className={`p-2 rounded-xl text-left border text-xs flex items-center space-x-2 ${
                      activeProfile.id === p.id
                        ? 'bg-tv-accent/20 border-tv-accent text-white font-bold'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{p.avatar}</span>
                    <div className="overflow-hidden">
                      <span className="block truncate">{p.name}</span>
                      <span className="text-[10px] text-tv-accent uppercase font-mono">{p.explainLevel}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'replay' && (
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Deterministic Script Replay
            </span>
            <p className="text-xs text-slate-400">
              Executes a deterministic scripted sequence for automated walkthroughs:
              Offside VAR (at 300ms) ➔ Goal celebration with stadium audio (at 4300ms).
            </p>

            <button
              onClick={handleRunReplay}
              className="w-full py-3 rounded-xl bg-tv-accent text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Launch Scripted Replay Sequence</span>
            </button>
          </div>
        )}

        {activeTab === 'trace' && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              Event Bus Queue &amp; Deduplication Trace
            </span>
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] no-scrollbar">
              {traces.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No events triggered yet.</span>
              ) : (
                traces.map((t) => (
                  <div
                    key={t.id}
                    className={`p-2 rounded-lg border text-left ${
                      t.action === 'PUBLISHED'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold">{t.type}</span>
                      <span className="opacity-60">{t.action}</span>
                    </div>
                    {t.reason && <p className="text-[9px] opacity-80 mt-0.5">{t.reason}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
              On-Device Ring Buffer Logs (Zero Telemetry)
            </span>
            <div className="max-h-72 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] no-scrollbar">
              {logs.map((l) => (
                <div key={l.id} className="p-1.5 rounded bg-white/5 border border-white/5 text-slate-300">
                  <span
                    className={`font-bold mr-1.5 ${
                      l.level === 'ERROR'
                        ? 'text-red-400'
                        : l.level === 'WARN'
                        ? 'text-tv-orange'
                        : l.level === 'INFO'
                        ? 'text-tv-accent'
                        : 'text-slate-400'
                    }`}
                  >
                    [{l.level}]
                  </span>
                  <span className="text-slate-400 mr-1.5">{l.module}:</span>
                  <span>{l.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer System Status */}
      <div className="pt-3 border-t border-white/10 text-[11px] text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span>Simulation Engine</span>
          <span className="text-emerald-400 font-mono">Active (Opt-in CV)</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Schema Store Version</span>
          <span className="text-tv-accent font-mono">v2.0 (Migrated)</span>
        </div>
      </div>
    </div>
  );
};
