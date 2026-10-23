import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from '../../core/ProfileContext';
import { Focusable } from '../common/Focusable';
import { Sparkles, Volume2, Mic, Flame, Trophy, X } from 'lucide-react';
import { tvAudio } from '../../utils/sound';
import confetti from 'canvas-confetti';

interface GoalCelebrationOverlayProps {
  onDismiss: () => void;
  scorerName?: string;
}

export const GoalCelebrationOverlay: React.FC<GoalCelebrationOverlayProps> = ({
  onDismiss,
  scorerName = 'Vinícius Jr.',
}) => {
  const { activeProfile, updateProfileScore, addBadgeToProfile } = useProfile();
  const [cheerLevel, setCheerLevel] = useState(35);
  const [cheerGoalReached, setCheerGoalReached] = useState(false);
  const [useLiveMic, setUseLiveMic] = useState(false);
  const [micActive, setMicActive] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    tvAudio.playStadiumRoar();
    tvAudio.playCheer();

    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.4 },
      colors: ['#00A8E1', '#FF9900', '#22D3EE', '#FFFFFF', '#E11D48'],
    });
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;

    if (useLiveMic) {
      navigator.mediaDevices
        ?.getUserMedia({ audio: true, video: false })
        .then((s) => {
          stream = s;
          setMicActive(true);
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          const source = ctx.createMediaStreamSource(s);
          source.connect(analyser);

          audioContextRef.current = ctx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const checkVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const volumePercent = Math.min(100, Math.round((average / 128) * 100));

            setCheerLevel((prev) => {
              const next = Math.max(prev, volumePercent);
              if (next >= 90 && !cheerGoalReached) {
                setCheerGoalReached(true);
                updateProfileScore(activeProfile.id, 50);
                addBadgeToProfile(activeProfile.id, 'Cheer Leader');
                tvAudio.playCheer();
              }
              return next;
            });

            animFrameRef.current = requestAnimationFrame(checkVolume);
          };

          checkVolume();
        })
        .catch(() => {
          setUseLiveMic(false);
          setMicActive(false);
        });
    } else {
      const interval = setInterval(() => {
        setCheerLevel((prev) => {
          const delta = Math.floor(Math.random() * 12) + 2;
          const next = Math.min(100, prev + delta);
          if (next >= 90 && !cheerGoalReached) {
            setCheerGoalReached(true);
            updateProfileScore(activeProfile.id, 50);
            addBadgeToProfile(activeProfile.id, 'Cheer Leader');
            tvAudio.playCheer();
          }
          return next;
        });
      }, 350);

      return () => clearInterval(interval);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, [useLiveMic, cheerGoalReached, activeProfile, updateProfileScore, addBadgeToProfile]);

  return (
    <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
      <div className="bg-tv-card border-2 border-tv-accent rounded-3xl max-w-xl w-full p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <Focusable
            id="cheer-close-btn"
            onSelect={onDismiss}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </Focusable>
        </div>

        <div className="flex flex-col items-center mb-6">
          <span className="text-5xl mb-2 animate-bounce">⚽🔥</span>
          <h2 className="text-3xl font-black text-white">GOAAAL! {scorerName.toUpperCase()}!</h2>
          <p className="text-xs text-tv-accent font-bold mt-1">LIVING ROOM STADIUM CHEER METER</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300 font-bold flex items-center space-x-1">
              <Volume2 className="w-4 h-4 text-tv-orange" />
              <span>Family Decibel Level: {cheerLevel}%</span>
            </span>
            <span className={`font-bold ${cheerGoalReached ? 'text-emerald-400' : 'text-slate-400'}`}>
              {cheerGoalReached ? '🔥 STADIUM ROAR UNLOCKED!' : 'Cheer louder to reach 90%!'}
            </span>
          </div>

          <div className="h-6 w-full bg-slate-800 rounded-full overflow-hidden p-1 border border-white/10 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                cheerGoalReached
                  ? 'bg-gradient-to-r from-tv-accent via-tv-orange to-red-500 shadow-tv-focus'
                  : 'bg-gradient-to-r from-tv-accent to-tv-orange'
              }`}
              style={{ width: `${cheerLevel}%` }}
            ></div>
          </div>
        </div>

        {cheerGoalReached && (
          <div className="bg-emerald-950/80 border border-emerald-500/60 p-3 rounded-2xl mb-6 flex items-center justify-center space-x-2 text-xs font-bold text-emerald-300 animate-pulse">
            <Trophy className="w-4 h-4 text-tv-orange" />
            <span>+50pts Bonus credited to {activeProfile.name}! Badge Earned: &quot;Cheer Leader&quot;</span>
          </div>
        )}

        <div className="flex items-center justify-center space-x-4">
          <Focusable
            id="cheer-btn-boost"
            onSelect={() => {
              tvAudio.playCheer();
              setCheerLevel((prev) => Math.min(100, prev + 25));
            }}
            className="flex items-center space-x-2 bg-tv-orange text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs"
          >
            <Flame className="w-4 h-4" />
            <span>Simulate Fan Cheer (+25%)</span>
          </Focusable>

          <Focusable
            id="cheer-btn-mic"
            onSelect={() => setUseLiveMic(!useLiveMic)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold border ${
              micActive
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-tv-surface border-white/10 text-slate-300'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{micActive ? 'Live Mic Active' : 'Enable TV Mic'}</span>
          </Focusable>

          <Focusable
            id="cheer-btn-continue"
            onSelect={onDismiss}
            className="bg-tv-accent text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs"
          >
            Back to Match
          </Focusable>
        </div>
      </div>
    </div>
  );
};
