import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Focusable } from '../common/Focusable';
import { Sparkles, Trophy, Users, HelpCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { tvAudio } from '../../utils/sound';
import confetti from 'canvas-confetti';
import { TriviaQuestion } from '../../types';
import { quizEventManager } from '../../core/quizFromEvents';
import { useProfile } from '../../core/ProfileContext';
import { useAppStore } from '../../core/store';
import {
  BASE_TRIVIA_QUESTIONS,
  calculateTriviaScore,
  BuzzerController,
  BuzzerState,
} from '../../core/triviaEngine';

export const TRIVIA_DATA: TriviaQuestion[] = BASE_TRIVIA_QUESTIONS;

interface FamilyTriviaProps {
  injectedQuestion?: TriviaQuestion | null;
}

export const FamilyTrivia: React.FC<FamilyTriviaProps> = ({ injectedQuestion }) => {
  const { activeProfile, updateProfileScore, addBadgeToProfile } = useProfile();
  const { state: appStoreState, dispatch } = useAppStore();

  const [questions, setQuestions] = useState<TriviaQuestion[]>(() => {
    const pending = quizEventManager.getPendingQuizzes();
    const seen = new Set(appStoreState.trivia.seenQuestionIds);

    // Prioritize unseen questions
    const unseenBase = BASE_TRIVIA_QUESTIONS.filter((q) => !seen.has(q.id));
    const basePool = unseenBase.length > 0 ? unseenBase : BASE_TRIVIA_QUESTIONS;

    const initial = [...pending, ...basePool];
    if (injectedQuestion && !initial.some((q) => q.id === injectedQuestion.id)) {
      return [injectedQuestion, ...initial];
    }
    return initial;
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [activeBuzzer, setActiveBuzzer] = useState<'Family Team A' | 'Family Team B'>('Family Team A');
  const [buzzerLockState, setBuzzerLockState] = useState<BuzzerState>('IDLE');
  const [showAnswer, setShowAnswer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isGameOver, setIsGameOver] = useState(false);
  const [scoreEarned, setScoreEarned] = useState<number>(0);

  const buzzerControllerRef = useRef<BuzzerController>(
    new BuzzerController((newState) => setBuzzerLockState(newState))
  );

  // If a new injected question arrives, place it at the front
  useEffect(() => {
    if (injectedQuestion) {
      setQuestions((prev) => {
        if (prev.some((q) => q.id === injectedQuestion.id)) return prev;
        return [injectedQuestion, ...prev];
      });
      setCurrentIdx(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setTimeLeft(15);
      buzzerControllerRef.current.reset();
    }
  }, [injectedQuestion]);

  const currentQ = questions[currentIdx] || BASE_TRIVIA_QUESTIONS[0];

  // Question countdown timer
  useEffect(() => {
    if (showAnswer || isGameOver) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShowAnswer(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showAnswer, isGameOver, currentIdx]);

  const handleSelectOption = (idx: number) => {
    if (showAnswer) return;
    setSelectedAnswer(idx);
    setShowAnswer(true);

    const isCorrect = idx === currentQ.correctIndex;

    // Pure scoring computation with time bonus and streak multiplier
    const scoreResult = calculateTriviaScore(isCorrect, timeLeft, activeProfile.streak);
    setScoreEarned(scoreResult.points);

    // Record answer in central store
    dispatch({
      type: 'RECORD_TRIVIA_ANSWER',
      questionId: currentQ.id,
      isCorrect,
    });

    if (isCorrect) {
      tvAudio.playCheer();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00A8E1', '#FF9900', '#22D3EE', '#FFFFFF'],
      });

      setScores((prev) => ({
        ...prev,
        [activeBuzzer === 'Family Team A' ? 'player1' : 'player2']:
          prev[activeBuzzer === 'Family Team A' ? 'player1' : 'player2'] + scoreResult.points,
      }));

      updateProfileScore(activeProfile.id, scoreResult.points);
      addBadgeToProfile(activeProfile.id, 'Trivia Champ');
      buzzerControllerRef.current.reset();
    } else {
      tvAudio.playSelect();
      buzzerControllerRef.current.recordIncorrectAnswer();
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setTimeLeft(15);
      setScoreEarned(0);
      buzzerControllerRef.current.reset();
      // Alternate buzzer player
      setActiveBuzzer((prev) => (prev === 'Family Team A' ? 'Family Team B' : 'Family Team A'));
    } else {
      setIsGameOver(true);
      tvAudio.playCheer();
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setTimeLeft(15);
    setIsGameOver(false);
    setScores({ player1: 0, player2: 0 });
    buzzerControllerRef.current.reset();
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Family Hub Bar */}
      <div className="flex items-center justify-between bg-tv-card/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-tv-accent/20 rounded-xl text-tv-accent border border-tv-accent/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Family Sports Trivia Buzzer</span>
              <span className="text-xs bg-tv-orange/20 text-tv-orange px-2 py-0.5 rounded-full font-bold">
                {activeBuzzer} Ready
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Active Member: <span className="text-white font-medium">{activeProfile.name}</span> • Streak Multiplier:{' '}
              <span className="text-tv-accent font-bold">{(1.0 + Math.min(0.5, activeProfile.streak * 0.1)).toFixed(1)}x</span>
            </p>
          </div>
        </div>

        {/* Live Scoreboard */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">TEAM A</span>
              <span className="text-lg font-black text-tv-accent">{scores.player1} pts</span>
            </div>
            <span className="text-slate-600 font-bold">:</span>
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block font-mono">TEAM B</span>
              <span className="text-lg font-black text-tv-orange">{scores.player2} pts</span>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center space-x-2 bg-black/40 px-3 py-2 rounded-xl border border-white/10">
            <span
              className={`w-3 h-3 rounded-full ${
                timeLeft <= 5 ? 'bg-red-500 animate-ping' : 'bg-tv-accent animate-pulse'
              }`}
            />
            <span
              className={`text-xl font-mono font-black ${
                timeLeft <= 5 ? 'text-red-400' : 'text-white'
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Card */}
      {!isGameOver ? (
        <div className="flex-1 bg-tv-card/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            {/* Question Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <span className="text-xs font-mono text-slate-400">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono">
                  Football &amp; Sports Knowledge
                </span>
                {buzzerLockState.startsWith('REBUTTAL') && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-tv-orange/20 text-tv-orange border border-tv-orange/40 font-bold animate-pulse">
                    ⚡ 5s Rebuttal Open
                  </span>
                )}
              </div>
            </div>

            {/* Question Text */}
            <h3 className="text-2xl font-bold text-white mb-6 leading-relaxed">
              {currentQ.question}
            </h3>

            {/* Multiple Choice Options */}
            <div className="grid grid-cols-2 gap-4">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === currentQ.correctIndex;

                let optClass = 'bg-white/5 border-white/10 text-white hover:bg-white/10';
                if (showAnswer) {
                  if (isCorrect) {
                    optClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-400';
                  } else if (isSelected) {
                    optClass = 'bg-red-500/20 border-red-500/50 text-red-300';
                  } else {
                    optClass = 'bg-white/5 border-white/5 text-slate-500 opacity-50';
                  }
                }

                return (
                  <Focusable
                    key={idx}
                    id={`trivia-opt-${idx}`}
                    onSelect={() => handleSelectOption(idx)}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all ${optClass}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-7 h-7 rounded-lg bg-white/10 font-mono text-xs font-bold flex items-center justify-center">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-semibold text-sm">{option}</span>
                    </div>

                    {showAnswer && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    {showAnswer && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                  </Focusable>
                );
              })}
            </div>
          </div>

          {/* Explanation & Next Button Drawer */}
          {showAnswer && (
            <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-start space-x-3 max-w-2xl">
                <div className="p-2 rounded-lg bg-tv-accent/20 text-tv-accent mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white mb-0.5">{currentQ.explanation}</p>
                  <p className="text-[11px] text-slate-400">💡 Did you know? {currentQ.funFact}</p>
                  {scoreEarned > 0 && (
                    <span className="text-[11px] text-emerald-400 font-bold block mt-1">
                      +{scoreEarned} points awarded to {activeProfile.name}!
                    </span>
                  )}
                </div>
              </div>

              <Focusable
                id="trivia-btn-next"
                onSelect={handleNextQuestion}
                className="px-5 py-2.5 rounded-xl bg-tv-accent text-slate-950 font-bold text-xs"
              >
                <span>{currentIdx + 1 < questions.length ? 'Next Question' : 'View Results'}</span>
              </Focusable>
            </div>
          )}
        </div>
      ) : (
        /* Game Over Trophy Celebration */
        <div className="flex-1 bg-tv-card/60 border border-white/10 rounded-2xl p-8 backdrop-blur-md flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-tv-orange/20 text-tv-orange flex items-center justify-center mb-4 border border-tv-orange/30">
            <Trophy className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Matchday Trivia Complete!</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Outstanding tactical knowledge shown by the whole family! Points have been synced to your profile.
          </p>

          <div className="flex items-center space-x-6 mb-8">
            <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block font-mono">TEAM A SCORE</span>
              <span className="text-3xl font-black text-tv-accent">{scores.player1} pts</span>
            </div>
            <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block font-mono">TEAM B SCORE</span>
              <span className="text-3xl font-black text-tv-orange">{scores.player2} pts</span>
            </div>
          </div>

          <Focusable
            id="trivia-btn-restart"
            onSelect={handleRestart}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-tv-accent text-slate-950 font-bold text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Another Round</span>
          </Focusable>
        </div>
      )}
    </div>
  );
};
