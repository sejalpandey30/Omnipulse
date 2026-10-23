import React, { useState, useEffect, useRef } from 'react';
import { Focusable } from '../common/Focusable';
import { Mic, MicOff, Hand, Volume2, Sparkles, Command, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';
import { tvAudio } from '../../utils/sound';
import { fusionController, GestureType, ScreenQuadrant } from '../../core/fusionController';
import { useProfile } from '../../core/ProfileContext';
import { OpticalGestureClassifier } from '../../core/gestureClassifier';
import { appLogger } from '../../core/logger';

interface AirGestureControllerProps {
  onCommandTriggered?: (command: string) => void;
}

// Browser speech recognition interface
interface SpeechRecognitionEventLike {
  results: Array<Array<{ transcript: string; confidence?: number }>>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export const AirGestureController: React.FC<AirGestureControllerProps> = ({ onCommandTriggered }) => {
  const { activeProfile, profiles, setActiveProfileId } = useProfile();
  const [isListening, setIsListening] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState<string>('Say "Show Sports", "Start Workout", or "Explain that"');
  const [activeGesture, setActiveGesture] = useState<string | null>(null);
  const [gestureStatus, setGestureStatus] = useState<string>('Optical Gesture Sensor Standby');
  const [selectedSeat, setSelectedSeat] = useState<ScreenQuadrant>('center');
  const [adaptiveHint, setAdaptiveHint] = useState<string | null>(null);

  const classifierRef = useRef<OpticalGestureClassifier>(new OpticalGestureClassifier());

  // Subscribe to adaptive hints
  useEffect(() => {
    const unsub = fusionController.subscribeHints((hint) => {
      setAdaptiveHint(hint);
    });
    return () => unsub();
  }, []);

  // Trigger command
  const executeCommand = (cmd: string) => {
    setLastSpokenText(`Triggered: "${cmd}"`);
    tvAudio.playSelect();
    onCommandTriggered?.(cmd);
  };

  // Web Speech API Integration with fallback & echo protection
  useEffect(() => {
    let recognition: SpeechRecognitionInstance | null = null;
    let isCancelled = false;

    if (isListening && typeof window !== 'undefined') {
      const SpeechRecognitionCtor =
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

      if (SpeechRecognitionCtor) {
        try {
          recognition = new SpeechRecognitionCtor();
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = 'en-US';

          recognition.onresult = (event: SpeechRecognitionEventLike) => {
            if (isCancelled) return;
            // Acoustic echo cancellation guard: don't process if speaker is outputting
            if (tvAudio.isAudioActive()) {
              appLogger.debug('AirGesture', 'Ignored voice input during active audio playback');
              return;
            }

            const lastResult = event.results[event.results.length - 1];
            if (lastResult && lastResult[0]) {
              const transcript = lastResult[0].transcript.trim().toLowerCase();
              setLastSpokenText(`Voice Detected: "${transcript}"`);
              fusionController.onVoiceRecognized(transcript);

              if (transcript.includes('sport') || transcript.includes('game') || transcript.includes('match')) {
                executeCommand('sports');
              } else if (transcript.includes('fitness') || transcript.includes('workout') || transcript.includes('exercise')) {
                executeCommand('fitness');
              } else if (transcript.includes('trivia') || transcript.includes('quiz') || transcript.includes('entertainment')) {
                executeCommand('entertainment');
              } else if (transcript.includes('pulse') || transcript.includes('recap')) {
                executeCommand('pulse');
              } else if (transcript.includes('home') || transcript.includes('dashboard')) {
                executeCommand('home');
              }
            }
          };

          recognition.onerror = (err) => {
            appLogger.warn('AirGesture', 'Speech recognition error', { error: err.error });
            if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
              setIsListening(false);
            }
          };

          recognition.onend = () => {
            // Restart if still listening
            if (!isCancelled && isListening) {
              try {
                recognition?.start();
              } catch {}
            }
          };

          recognition.start();
        } catch (err) {
          appLogger.warn('AirGesture', 'Failed to start speech recognition', { err: String(err) });
          setIsListening(false);
        }
      } else {
        setLastSpokenText('Microphone speech recognition unavailable on this browser. Use D-pad or gestures.');
      }
    }

    return () => {
      isCancelled = true;
      if (recognition) {
        try {
          recognition.abort();
        } catch {}
      }
    };
  }, [isListening]);

  // Air Gesture Simulation Trigger with classifier
  const triggerGesture = (type: GestureType, gestureName: string, mappedAction: string, seat: ScreenQuadrant = 'center') => {
    const xCoord = seat === 'left' ? 0.2 : seat === 'right' ? 0.8 : 0.5;
    const validatedEvent = classifierRef.current.processHandFrame(type, xCoord, 0.5, 0.95);

    if (!validatedEvent && type === 'OPEN_PALM') {
      // Simulate completing the hold time
      setTimeout(() => {
        const heldEvent = classifierRef.current.processHandFrame(type, xCoord, 0.5, 0.95, Date.now() + 350);
        if (heldEvent) {
          dispatchGesture(heldEvent.type, gestureName, mappedAction, seat);
        }
      }, 310);
      setGestureStatus(`Holding ✋ Open Palm... (300ms hold)`);
      return;
    }

    dispatchGesture(type, gestureName, mappedAction, seat);
  };

  const dispatchGesture = (type: GestureType, gestureName: string, mappedAction: string, seat: ScreenQuadrant) => {
    setActiveGesture(gestureName);
    setSelectedSeat(seat);
    setGestureStatus(`Gesture Recognized: ${gestureName} (${seat} couch seat) ➜ ${mappedAction}`);
    tvAudio.playFocus();

    fusionController.onGestureDetected(type, seat);

    // Heuristic: map seat to family member
    if (seat === 'left') {
      const dad = profiles.find((p) => p.id === 'dad');
      if (dad) setActiveProfileId(dad.id);
    } else if (seat === 'right') {
      const mom = profiles.find((p) => p.id === 'mom');
      if (mom) setActiveProfileId(mom.id);
    } else {
      const kid = profiles.find((p) => p.id === 'kid');
      if (kid) setActiveProfileId(kid.id);
    }

    // Auto-clear active badge
    setTimeout(() => {
      setActiveGesture(null);
    }, 2500);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-tv-card/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-tv-accent/20 rounded-xl text-tv-accent border border-tv-accent/30">
            <Hand className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Multi-Modal Fusion Controller</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                Active
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Combines Computer Vision Optical Gestures with Speech Recognition
            </p>
          </div>
        </div>

        {/* Voice Listening Toggle */}
        <Focusable
          id="gesture-btn-mic"
          onSelect={() => {
            tvAudio.playSelect();
            setIsListening((prev) => !prev);
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            isListening
              ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isListening ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
          <span>{isListening ? 'Voice Listening Active' : 'Enable Voice Command'}</span>
        </Focusable>
      </div>

      {/* Adaptive Hint Banner */}
      {adaptiveHint && (
        <div className="bg-tv-orange/15 border border-tv-orange/40 rounded-xl p-3 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-xs text-white">
            <Sparkles className="w-4 h-4 text-tv-orange" />
            <span>{adaptiveHint}</span>
          </div>
        </div>
      )}

      {/* Main Grid: Gestures & Living Room Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Side: Gesture Trigger Tiles */}
        <div className="col-span-8 bg-tv-card/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Optical Gesture Simulators (Fire TV Camera)
            </span>

            <div className="grid grid-cols-2 gap-3">
              <Focusable
                id="gesture-tile-palm"
                onSelect={() => triggerGesture('OPEN_PALM', '✋ Open Palm (Hold)', 'Pause Stream', 'center')}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-start space-x-3 text-left"
              >
                <span className="text-3xl">✋</span>
                <div>
                  <h4 className="font-bold text-white text-sm">Open Palm</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Pause or freeze live broadcast stream (300ms hold)</p>
                  <span className="inline-block mt-2 text-[10px] font-mono text-tv-accent bg-tv-accent/10 px-2 py-0.5 rounded">
                    Action: PAUSE
                  </span>
                </div>
              </Focusable>

              <Focusable
                id="gesture-tile-point"
                onSelect={() => triggerGesture('POINT', '👉 Point at Screen', 'Multi-Modal Explain-It Target', 'left')}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-start space-x-3 text-left"
              >
                <span className="text-3xl">👉</span>
                <div>
                  <h4 className="font-bold text-white text-sm">Point at Player</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Pairs with &quot;Explain that&quot; voice command within 1.5s</p>
                  <span className="inline-block mt-2 text-[10px] font-mono text-tv-orange bg-tv-orange/10 px-2 py-0.5 rounded">
                    Action: EXPLAIN (Targeted)
                  </span>
                </div>
              </Focusable>

              <Focusable
                id="gesture-tile-thumbs"
                onSelect={() => triggerGesture('THUMBS_UP', '👍 Thumbs Up', 'Resume & Confirm Call', 'right')}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-start space-x-3 text-left"
              >
                <span className="text-3xl">👍</span>
                <div>
                  <h4 className="font-bold text-white text-sm">Thumbs Up</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Resume playback and confirm VAR decision</p>
                  <span className="inline-block mt-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Action: RESUME
                  </span>
                </div>
              </Focusable>

              <Focusable
                id="gesture-tile-swipe"
                onSelect={() => triggerGesture('SWIPE_RIGHT', '👉 Wave / Swipe Right', 'Switch to Sports View', 'center')}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-start space-x-3 text-left"
              >
                <span className="text-3xl">👋</span>
                <div>
                  <h4 className="font-bold text-white text-sm">Swipe Right</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Velocity-based navigation switch to match view</p>
                  <span className="inline-block mt-2 text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                    Action: NAVIGATE
                  </span>
                </div>
              </Focusable>
            </div>
          </div>

          {/* Sensor Status Log */}
          <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-tv-accent animate-ping" />
              <span className="text-xs font-mono text-white">{gestureStatus}</span>
            </div>
            {activeGesture && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-tv-accent text-slate-950 animate-bounce">
                Detected!
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Family Couch Seating & Voice Status */}
        <div className="col-span-4 flex flex-col space-y-3">
          {/* Spatial Couch Seat Map */}
          <div className="bg-tv-card/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Couch Spatial Identification
            </span>
            <p className="text-xs text-slate-400 mb-3">
              Maps gesture screen quadrant to family profile seat.
            </p>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  selectedSeat === 'left'
                    ? 'bg-tv-accent/20 border-tv-accent text-tv-accent font-bold ring-2 ring-tv-accent'
                    : 'bg-white/5 border-white/5 text-slate-400'
                }`}
              >
                <span className="text-2xl block mb-1">👨‍💼</span>
                <span className="text-xs block font-semibold text-white">Left Seat</span>
                <span className="text-[10px] text-slate-400">Dad (Dave)</span>
              </div>

              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  selectedSeat === 'center'
                    ? 'bg-tv-accent/20 border-tv-accent text-tv-accent font-bold ring-2 ring-tv-accent'
                    : 'bg-white/5 border-white/5 text-slate-400'
                }`}
              >
                <span className="text-2xl block mb-1">👧</span>
                <span className="text-xs block font-semibold text-white">Center Seat</span>
                <span className="text-[10px] text-slate-400">Kid (Maya)</span>
              </div>

              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  selectedSeat === 'right'
                    ? 'bg-tv-accent/20 border-tv-accent text-tv-accent font-bold ring-2 ring-tv-accent'
                    : 'bg-white/5 border-white/5 text-slate-400'
                }`}
              >
                <span className="text-2xl block mb-1">👩‍⚕️</span>
                <span className="text-xs block font-semibold text-white">Right Seat</span>
                <span className="text-[10px] text-slate-400">Mom (Sarah)</span>
              </div>
            </div>
          </div>

          {/* Voice Input Status Panel */}
          <div className="bg-tv-card/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Speech Intent Parser
              </span>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 mb-3">
                <span className="text-[10px] text-slate-400 block font-mono">LATEST VOICE RECOGNITION</span>
                <p className="text-xs font-semibold text-white mt-1 italic">&quot;{lastSpokenText}&quot;</p>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voice + Point Fusion Window: 1.5 seconds</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acoustic Echo Muting: Active</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active Profile: {activeProfile.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
