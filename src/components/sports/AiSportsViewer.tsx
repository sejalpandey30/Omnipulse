import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Focusable } from '../common/Focusable';
import { Play, Pause, Camera, Eye, Activity, ShieldAlert, Zap, Flame, BarChart3, ChevronRight, HelpCircle } from 'lucide-react';
import { PlayerStats, HighlightMoment, TriviaQuestion } from '../../types';
import { matchEventBus, MatchEvent } from '../../core/matchEventBus';
import { ExplainItOverlay } from '../coach/ExplainItOverlay';
import { GoalCelebrationOverlay } from '../coach/GoalCelebrationOverlay';
import { HalftimeChallenge } from '../coach/HalftimeChallenge';
import { quizEventManager } from '../../core/quizFromEvents';
import { useProfile } from '../../core/ProfileContext';
import { MATCH_EVENT_EXPLANATIONS } from '../../content/explanations';
import { tvAudio } from '../../utils/sound';
import { calculateDeterministicWinProbability, HighlightManager } from './sportsEngine';
import { useAppStore } from '../../core/store';

const INITIAL_PLAYERS: PlayerStats[] = [
  { id: 'p1', name: 'K. Mbappé', number: 9, position: 'FWD', team: 'Home', speed: '34.8 km/h', distance: '8.4 km', heartRate: 168, fatigueIndex: 28, x: 74, y: 38 },
  { id: 'p2', name: 'Vinícius Jr.', number: 7, position: 'WING', team: 'Home', speed: '33.2 km/h', distance: '9.1 km', heartRate: 172, fatigueIndex: 34, x: 68, y: 22 },
  { id: 'p3', name: 'J. Bellingham', number: 5, position: 'MID', team: 'Home', speed: '28.5 km/h', distance: '10.8 km', heartRate: 162, fatigueIndex: 41, x: 52, y: 50 },
  { id: 'p4', name: 'F. Valverde', number: 8, position: 'MID', team: 'Home', speed: '31.0 km/h', distance: '11.2 km', heartRate: 175, fatigueIndex: 45, x: 44, y: 68 },
  { id: 'p5', name: 'E. Haaland', number: 9, position: 'FWD', team: 'Away', speed: '35.1 km/h', distance: '7.9 km', heartRate: 170, fatigueIndex: 30, x: 30, y: 46 },
  { id: 'p6', name: 'K. De Bruyne', number: 17, position: 'MID', team: 'Away', speed: '27.4 km/h', distance: '9.6 km', heartRate: 158, fatigueIndex: 52, x: 38, y: 55 },
];

const INITIAL_HIGHLIGHTS: HighlightMoment[] = [
  { id: 'h1', timestamp: '24\'', title: 'Counter Attack Breakout', category: 'Tactical Counter', aiConfidence: 96, thumbnail: '⚡' },
  { id: 'h2', timestamp: '39\'', title: 'Curling Shot on Target', category: 'Save', aiConfidence: 94, thumbnail: '🧤' },
  { id: 'h3', timestamp: '58\'', title: 'Go-Ahead Screamer Goal', category: 'Goal', aiConfidence: 99, thumbnail: '⚽' },
  { id: 'h4', timestamp: '71\'', title: 'Tactical Offside Trap', category: 'VAR Review', aiConfidence: 91, thumbnail: '📐' },
];

export interface AiSportsViewerProps {
  onNavigateToTrivia?: (question?: TriviaQuestion) => void;
  onNavigateToFitness?: () => void;
}

export const AiSportsViewer: React.FC<AiSportsViewerProps> = ({
  onNavigateToTrivia,
}) => {
  const { activeProfile } = useProfile();
  const { state: appStoreState, dispatch } = useAppStore();

  // Central simulation clock
  const [matchMinute, setMatchMinute] = useState(appStoreState.match.time || 58);
  const [isPlaying, setIsPlaying] = useState(appStoreState.match.isPlaying);
  const [homeScore, setHomeScore] = useState(appStoreState.match.homeScore || 2);
  const [awayScore, setAwayScore] = useState(appStoreState.match.awayScore || 1);
  const [momentum, setMomentum] = useState(appStoreState.match.momentum || 0.25);

  const [showTacticalOverlay, setShowTacticalOverlay] = useState(true);
  const [showOffsideLine, setShowOffsideLine] = useState(true);
  const [showHeatmaps, setShowHeatmaps] = useState(false);
  const [cameraAngle, setCameraAngle] = useState<'Broadcast' | 'Tactical 3D' | 'Player ISO'>('Tactical 3D');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats>(INITIAL_PLAYERS[0]);
  const [activeHighlight, setActiveHighlight] = useState<HighlightMoment | null>(null);

  const highlightManagerRef = useRef<HighlightManager>(new HighlightManager(INITIAL_HIGHLIGHTS));
  const [highlightsList, setHighlightsList] = useState<HighlightMoment[]>(() =>
    highlightManagerRef.current.getHighlights()
  );

  // Co-Commentator & Match Events State
  const [currentEvent, setCurrentEvent] = useState<MatchEvent | null>(null);
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const [showHalftimeChallenge, setShowHalftimeChallenge] = useState(false);
  const [halftimeReason, setHalftimeReason] = useState<'HALFTIME' | 'LULL'>('HALFTIME');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Deterministic Win Probability derived from math formula
  const homeWinProb = calculateDeterministicWinProbability(homeScore, awayScore, matchMinute, momentum);

  // Simulation Clock Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        setMatchMinute((prev) => {
          if (prev >= 90) return 90;
          const next = prev + 1;
          dispatch({ type: 'UPDATE_MATCH', match: { time: next } });
          return next;
        });
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, dispatch]);

  // Subscribe to Match Event Bus
  useEffect(() => {
    const unsubscribe = matchEventBus.subscribe((evt: MatchEvent) => {
      setIsPlaying(false);

      if (evt.type === 'GOAL') {
        setHomeScore((s) => s + 1);
        setMomentum(0.6);
        setShowGoalCelebration(true);
        highlightManagerRef.current.addHighlight({
          id: `h-${Date.now()}`,
          timestamp: `${evt.time}'`,
          title: 'Goal: ' + (evt.tacticalData?.goalScorer || 'Brilliant Strike'),
          category: 'Goal',
          aiConfidence: 99,
          thumbnail: '⚽',
        });
        setHighlightsList(highlightManagerRef.current.getHighlights());
      } else if (evt.type === 'HALFTIME' || evt.type === 'LULL') {
        setHalftimeReason(evt.type);
        setShowHalftimeChallenge(true);
      } else {
        setCurrentEvent(evt);
      }
    });

    return () => unsubscribe();
  }, []);

  const triggerManualExplain = () => {
    tvAudio.playSelect();
    setIsPlaying(false);
    const explanationSet = MATCH_EVENT_EXPLANATIONS.OFFSIDE[activeProfile.commentaryTone];
    const mockEvt: MatchEvent = {
      id: `manual-explain-${Date.now()}`,
      type: 'OFFSIDE',
      time: matchMinute,
      players: ['K. Mbappé'],
      explanation: {
        kid: explanationSet.kid,
        casual: explanationSet.casual,
        expert: explanationSet.expert,
      },
      tacticalData: {
        offsidePlayer: 'K. Mbappé',
        defendingLineX: 68,
        attackingPlayerX: 72,
        annotationType: 'OFFSIDE_LINE',
      },
    };
    setCurrentEvent(mockEvt);
  };

  const handleLaunchQuizFromEvent = (evt: MatchEvent) => {
    const quiz = quizEventManager.recordEvent(evt);
    setCurrentEvent(null);
    setIsPlaying(true);
    if (onNavigateToTrivia) {
      onNavigateToTrivia(quiz);
    }
  };

  // Canvas Pitch & Tactical Animation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const render = () => {
      if (isPlaying) {
        tick += 0.02;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Pitch Grass Gradient
      const grassGrad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        100,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 1.4
      );
      grassGrad.addColorStop(0, '#102E20');
      grassGrad.addColorStop(1, '#091A12');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Chalk Pitch Markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2.5;

      // Outer boundary & Half-way Line
      ctx.strokeRect(30, 20, canvas.width - 60, canvas.height - 40);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 20);
      ctx.lineTo(canvas.width / 2, canvas.height - 20);
      ctx.stroke();

      // Center Circle
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty Boxes
      ctx.strokeRect(30, canvas.height / 2 - 90, 110, 180);
      ctx.strokeRect(canvas.width - 140, canvas.height / 2 - 90, 110, 180);

      // Render Offside Visual Line
      if (showOffsideLine) {
        const offsideX = (canvas.width * 0.68) + Math.sin(tick * 1.5) * 5;
        ctx.strokeStyle = '#FF9900';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(offsideX, 20);
        ctx.lineTo(offsideX, canvas.height - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label Tag on line
        ctx.fillStyle = 'rgba(255, 153, 0, 0.9)';
        ctx.fillRect(offsideX - 45, 26, 90, 20);
        ctx.fillStyle = '#0B0E14';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VAR LINE 68.4m', offsideX, 40);
      }

      // Render Dynamic Player Nodes
      INITIAL_PLAYERS.forEach((player, idx) => {
        const px = (canvas.width * (player.x / 100)) + Math.sin(tick + idx) * 12;
        const py = (canvas.height * (player.y / 100)) + Math.cos(tick + idx * 0.8) * 8;

        const isHome = player.team === 'Home';
        const isSelected = selectedPlayer.id === player.id;

        // Player Aura / Glow
        if (showTacticalOverlay || isSelected) {
          ctx.beginPath();
          ctx.arc(px, py, isSelected ? 24 : 16, 0, Math.PI * 2);
          ctx.fillStyle = isSelected
            ? 'rgba(0, 168, 225, 0.45)'
            : isHome
            ? 'rgba(0, 168, 225, 0.2)'
            : 'rgba(239, 68, 68, 0.2)';
          ctx.fill();
        }

        // Inner Player Circle Node
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fillStyle = isHome ? '#00A8E1' : '#EF4444';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        // Player Number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.number.toString(), px, py + 3.5);

        // Player Name Floating Tag
        if (showTacticalOverlay || isSelected) {
          ctx.fillStyle = 'rgba(11, 14, 20, 0.85)';
          const textW = ctx.measureText(player.name).width;
          ctx.fillRect(px - textW / 2 - 6, py - 26, textW + 12, 16);
          ctx.strokeStyle = isSelected ? '#00A8E1' : 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px - textW / 2 - 6, py - 26, textW + 12, 16);

          ctx.fillStyle = isSelected ? '#00A8E1' : '#FFFFFF';
          ctx.font = '9px sans-serif';
          ctx.fillText(player.name, px, py - 14);
        }
      });

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, showTacticalOverlay, showOffsideLine, selectedPlayer]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Match Bar */}
      <div className="flex items-center justify-between bg-tv-card/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-black text-white">REAL MADRID</span>
            <span className="text-2xl font-mono font-black text-tv-accent">{homeScore}</span>
            <span className="text-slate-500 font-bold">-</span>
            <span className="text-2xl font-mono font-black text-red-400">{awayScore}</span>
            <span className="text-xl font-black text-white">MAN CITY</span>
          </div>
          <div className="flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-white font-bold">{matchMinute}&apos; LIVE</span>
          </div>
        </div>

        {/* Win Probability Forecast Bar (Deterministic Formula) */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">AI Win Probability</span>
            <span className="text-sm font-bold text-tv-accent">{homeWinProb}% RM Win</span>
          </div>
          <div className="w-36 h-2.5 bg-red-500/30 rounded-full overflow-hidden flex border border-white/10">
            <div
              className="bg-tv-accent h-full transition-all duration-700 ease-out"
              style={{ width: `${homeWinProb}%` }}
            />
            <div
              className="bg-red-500 h-full transition-all duration-700 ease-out"
              style={{ width: `${100 - homeWinProb}%` }}
            />
          </div>

          <Focusable
            id="sports-btn-explain-now"
            onSelect={triggerManualExplain}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-tv-orange/20 border border-tv-orange/40 text-tv-orange text-xs font-bold hover:bg-tv-orange/30"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Explain-It AI</span>
          </Focusable>
        </div>
      </div>

      {/* Main Pitch & Telemetry Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Tactical Canvas Area */}
        <div className="col-span-9 bg-tv-card/60 border border-white/10 rounded-2xl overflow-hidden relative flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={860}
            height={460}
            className="w-full h-full object-contain rounded-2xl"
          />

          {/* Broadcast Camera Angle Watermark Badge */}
          <div className="absolute top-4 left-4 bg-slate-950/80 border border-white/10 backdrop-blur-md rounded-xl px-3 py-1.5 flex items-center space-x-2">
            <Camera className="w-4 h-4 text-tv-accent" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">{cameraAngle}</span>
          </div>

          {/* Play/Pause & Angle Switcher Floating Bar */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center space-x-2 pointer-events-auto">
              <Focusable
                id="sports-ctrl-play"
                onSelect={() => {
                  tvAudio.playSelect();
                  setIsPlaying((prev) => !prev);
                }}
                className="p-3 bg-tv-accent text-slate-950 font-black rounded-xl flex items-center justify-center shadow-lg"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </Focusable>

              <Focusable
                id="sports-ctrl-overlay"
                onSelect={() => {
                  tvAudio.playSelect();
                  setShowTacticalOverlay((prev) => !prev);
                }}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold backdrop-blur-md ${
                  showTacticalOverlay
                    ? 'bg-tv-card/90 border-tv-accent text-tv-accent'
                    : 'bg-tv-card/60 border-white/10 text-slate-300'
                }`}
              >
                Tactical Overlay
              </Focusable>

              <Focusable
                id="sports-ctrl-offside"
                onSelect={() => {
                  tvAudio.playSelect();
                  setShowOffsideLine((prev) => !prev);
                }}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold backdrop-blur-md ${
                  showOffsideLine
                    ? 'bg-tv-card/90 border-tv-orange text-tv-orange'
                    : 'bg-tv-card/60 border-white/10 text-slate-300'
                }`}
              >
                VAR Offside Line
              </Focusable>
            </div>

            {/* Camera Angle Selector */}
            <div className="flex items-center space-x-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 pointer-events-auto">
              {(['Broadcast', 'Tactical 3D', 'Player ISO'] as const).map((angle) => (
                <Focusable
                  key={angle}
                  id={`sports-cam-${angle.toLowerCase().replace(' ', '-')}`}
                  onSelect={() => {
                    tvAudio.playSelect();
                    setCameraAngle(angle);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    cameraAngle === angle
                      ? 'bg-tv-accent text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {angle}
                </Focusable>
              ))}
            </div>
          </div>
        </div>

        {/* Right Telemetry & AI Highlights Panel */}
        <div className="col-span-3 flex flex-col space-y-3">
          {/* Selected Player Telemetry Card */}
          <div className="bg-tv-card/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Live Player Telemetry
                </span>
                <h4 className="font-bold text-white text-sm">{selectedPlayer.name}</h4>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-tv-accent/20 text-tv-accent">
                #{selectedPlayer.number} {selectedPlayer.position}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Top Speed</span>
                <span className="font-mono font-bold text-white">{selectedPlayer.speed}</span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Distance</span>
                <span className="font-mono font-bold text-white">{selectedPlayer.distance}</span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                <span className="font-mono font-bold text-red-400">{selectedPlayer.heartRate} bpm</span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Fatigue</span>
                <span className="font-mono font-bold text-tv-orange">{selectedPlayer.fatigueIndex}%</span>
              </div>
            </div>
          </div>

          {/* AI Instant Highlights Carousel */}
          <div className="bg-tv-card/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex-1 flex flex-col overflow-hidden">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Ranked Highlights
            </span>
            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
              {highlightsList.map((hl) => (
                <Focusable
                  key={hl.id}
                  id={`hl-${hl.id}`}
                  onSelect={() => {
                    tvAudio.playSelect();
                    setActiveHighlight(hl);
                    const minuteNum = parseInt(hl.timestamp.replace(/[^0-9]/g, ''), 10) || 50;
                    setMatchMinute(minuteNum);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-left"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{hl.thumbnail}</span>
                    <div>
                      <span className="text-xs font-bold text-white block line-clamp-1">{hl.title}</span>
                      <span className="text-[10px] text-slate-400">{hl.category}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-tv-accent">{hl.timestamp}</span>
                </Focusable>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Integrated Explain-It Tactical Co-Commentator Modal */}
      {currentEvent && (
        <ExplainItOverlay
          event={currentEvent}
          onDismiss={() => {
            setCurrentEvent(null);
            setIsPlaying(true);
          }}
          onLaunchQuizFromEvent={handleLaunchQuizFromEvent}
        />
      )}

      {/* Goal Celebration Modal */}
      {showGoalCelebration && (
        <GoalCelebrationOverlay
          scorerName="Vinícius Jr."
          onDismiss={() => {
            setShowGoalCelebration(false);
            setIsPlaying(true);
          }}
        />
      )}

      {/* Halftime or Lull Fitness Challenge */}
      {showHalftimeChallenge && (
        <HalftimeChallenge
          reason={halftimeReason}
          onComplete={() => {
            setShowHalftimeChallenge(false);
            setIsPlaying(true);
          }}
        />
      )}
    </div>
  );
};
