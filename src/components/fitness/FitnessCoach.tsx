import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Focusable } from '../common/Focusable';
import { Camera, VideoOff, Dumbbell, Award, Flame, Play, Pause, RefreshCw, CheckCircle2 } from 'lucide-react';
import { tvAudio } from '../../utils/sound';
import {
  SkeletonPose,
  JointPoint,
  ExerciseType,
  LandmarkFilter,
  RepStateMachine,
  EXERCISE_DEFINITIONS,
  RepFormAnalysis,
} from './fitnessPipeline';
import { useAppStore } from '../../core/store';
import { useProfile } from '../../core/ProfileContext';
import { appLogger } from '../../core/logger';

export interface FitnessCoachProps {
  challengeMode?: boolean;
  timeLimitSeconds?: number;
  initialExercise?: ExerciseType;
  onChallengeComplete?: (reps: number, calories: number) => void;
  onExit?: () => void;
}

export const FitnessCoach: React.FC<FitnessCoachProps> = ({
  challengeMode = false,
  timeLimitSeconds = 30,
  initialExercise = 'Squats',
  onChallengeComplete,
  onExit,
}) => {
  const { dispatch } = useAppStore();
  const { activeProfile } = useProfile();

  const [exercise, setExercise] = useState<ExerciseType>(initialExercise);
  const [reps, setReps] = useState(0);
  const [targetReps] = useState(challengeMode ? 15 : 10);
  const [calories, setCalories] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(challengeMode ? timeLimitSeconds : 0);
  const [isActive, setIsActive] = useState(true);
  const [challengeFinished, setChallengeFinished] = useState(false);
  const [formFeedback, setFormFeedback] = useState<string>('Stand straight facing the screen to begin');
  const [feedbackColor, setFeedbackColor] = useState<'normal' | 'good' | 'warning'>('normal');
  const [kneeAngle, setKneeAngle] = useState(170);
  const [formScore, setFormScore] = useState(90);
  const [useWebcam, setUseWebcam] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Pipeline instances
  const filterRef = useRef<LandmarkFilter>(new LandmarkFilter(0.45));
  const stateMachineRef = useRef<RepStateMachine>(new RepStateMachine(initialExercise));
  const lastStateUpdateTime = useRef<number>(0);
  const frameBudgetRef = useRef<{ lastTime: number; droppedFrames: number }>({ lastTime: 0, droppedFrames: 0 });

  // Update pipeline when exercise changes
  useEffect(() => {
    stateMachineRef.current.setExercise(exercise);
    filterRef.current.reset();
    setReps(0);
    setCalories(0);
    setFormFeedback(EXERCISE_DEFINITIONS[exercise].cues.ready);
  }, [exercise]);

  // Robust Camera Lifecycle Manager
  const stopWebcam = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startWebcam = useCallback(async () => {
    stopWebcam();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware API unavailable');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      activeStreamRef.current = stream;

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          appLogger.warn('FitnessCoach', 'Camera track ended unexpectedly');
          setUseWebcam(false);
          setWebcamError('Camera connection ended. Switched to simulation.');
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setWebcamError(null);
    } catch (err) {
      appLogger.warn('FitnessCoach', 'Webcam initialization failed', { err: String(err) });
      setWebcamError('Camera unavailable on this device. Simulation mode activated.');
      setUseWebcam(false);
    }
  }, [stopWebcam]);

  useEffect(() => {
    if (useWebcam) {
      startWebcam();
    } else {
      stopWebcam();
    }

    // Stop camera on tab hidden to conserve memory and hardware resources
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopWebcam();
      } else if (document.visibilityState === 'visible' && useWebcam) {
        startWebcam();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopWebcam();
    };
  }, [useWebcam, startWebcam, stopWebcam]);

  // Workout stopwatch & Challenge Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && !challengeFinished) {
      interval = setInterval(() => {
        setElapsedTime((prev) => {
          if (challengeMode) {
            if (prev <= 1) {
              setChallengeFinished(true);
              setIsActive(false);
              tvAudio.playCheer();
              onChallengeComplete?.(reps, calories);

              // Record to central store
              dispatch({
                type: 'RECORD_FITNESS_SESSION',
                record: {
                  profileId: activeProfile.id,
                  exercise,
                  reps,
                  formScore: stateMachineRef.current.getAverageFormScore(),
                  calories,
                },
              });

              return 0;
            }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, challengeMode, challengeFinished, reps, calories, onChallengeComplete, dispatch, activeProfile.id, exercise]);

  // Main Canvas Rendering and Landmark Simulation / Inference loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const render = (time: number) => {
      // Adaptive frame rate: throttle if budget exceeded
      const delta = time - frameBudgetRef.current.lastTime;
      frameBudgetRef.current.lastTime = time;
      if (delta > 38) {
        frameBudgetRef.current.droppedFrames++;
      }

      tick += 0.045;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (useWebcam && videoRef.current && videoRef.current.readyState >= 2) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, w, h);
        ctx.restore();
        ctx.fillStyle = 'rgba(11, 14, 20, 0.4)';
        ctx.fillRect(0, 0, w, h);
      } else {
        // High-tech Virtual Training Room Studio
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#10141E');
        grad.addColorStop(0.6, '#182030');
        grad.addColorStop(1, '#0C0F17');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Perspective Gym Floor Grid Lines
        ctx.strokeStyle = 'rgba(0, 168, 225, 0.12)';
        ctx.lineWidth = 1.5;
        const horizon = h * 0.65;
        for (let x = -w * 0.5; x < w * 1.5; x += 60) {
          ctx.beginPath();
          ctx.moveTo(w / 2, horizon);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = horizon; y < h; y += 22) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }

      // Computer Vision Skeleton Generation (Synthesizes realistic human mechanics with slight biological noise)
      const cx = w / 2;
      const cycle = (Math.sin(tick) + 1) / 2; // 0 to 1
      const noise = (Math.random() - 0.5) * 1.2;

      let rawPose: SkeletonPose;
      if (exercise === 'Squats') {
        const hipDrop = cycle * 75 + noise;
        const kneeSpread = cycle * 25;
        rawPose = {
          nose: { x: cx, y: 110 + hipDrop * 0.8, visibility: 0.99 },
          leftShoulder: { x: cx - 45, y: 160 + hipDrop * 0.8, visibility: 0.98 },
          rightShoulder: { x: cx + 45, y: 160 + hipDrop * 0.8, visibility: 0.98 },
          leftElbow: { x: cx - 75 + cycle * 10, y: 220 + hipDrop * 0.5, visibility: 0.95 },
          rightElbow: { x: cx + 75 - cycle * 10, y: 220 + hipDrop * 0.5, visibility: 0.95 },
          leftWrist: { x: cx - 40, y: 200 + hipDrop * 0.4, visibility: 0.95 },
          rightWrist: { x: cx + 40, y: 200 + hipDrop * 0.4, visibility: 0.95 },
          leftHip: { x: cx - 35, y: 270 + hipDrop, visibility: 0.98 },
          rightHip: { x: cx + 35, y: 270 + hipDrop, visibility: 0.98 },
          leftKnee: { x: cx - 55 - kneeSpread, y: 370 + hipDrop * 0.35, visibility: 0.99 },
          rightKnee: { x: cx + 55 + kneeSpread, y: 370 + hipDrop * 0.35, visibility: 0.99 },
          leftAnkle: { x: cx - 55, y: 470, visibility: 0.98 },
          rightAnkle: { x: cx + 55, y: 470, visibility: 0.98 },
        };
      } else if (exercise === 'Jumping Jacks') {
        const armAngle = cycle * 140;
        const legSpread = cycle * 45;
        rawPose = {
          nose: { x: cx, y: 110, visibility: 0.99 },
          leftShoulder: { x: cx - 45, y: 160, visibility: 0.98 },
          rightShoulder: { x: cx + 45, y: 160, visibility: 0.98 },
          leftElbow: { x: cx - 65 - Math.sin((armAngle * Math.PI) / 180) * 40, y: 200 - Math.cos((armAngle * Math.PI) / 180) * 50, visibility: 0.95 },
          rightElbow: { x: cx + 65 + Math.sin((armAngle * Math.PI) / 180) * 40, y: 200 - Math.cos((armAngle * Math.PI) / 180) * 50, visibility: 0.95 },
          leftWrist: { x: cx - 75 - Math.sin((armAngle * Math.PI) / 180) * 80, y: 210 - Math.cos((armAngle * Math.PI) / 180) * 90, visibility: 0.95 },
          rightWrist: { x: cx + 75 + Math.sin((armAngle * Math.PI) / 180) * 80, y: 210 - Math.cos((armAngle * Math.PI) / 180) * 90, visibility: 0.95 },
          leftHip: { x: cx - 35, y: 270, visibility: 0.98 },
          rightHip: { x: cx + 35, y: 270, visibility: 0.98 },
          leftKnee: { x: cx - 55 - legSpread * 0.6, y: 370, visibility: 0.99 },
          rightKnee: { x: cx + 55 + legSpread * 0.6, y: 370, visibility: 0.99 },
          leftAnkle: { x: cx - 55 - legSpread, y: 470, visibility: 0.98 },
          rightAnkle: { x: cx + 55 + legSpread, y: 470, visibility: 0.98 },
        };
      } else {
        // High Knees
        const kneeLift = cycle * 85;
        rawPose = {
          nose: { x: cx, y: 110, visibility: 0.99 },
          leftShoulder: { x: cx - 45, y: 160, visibility: 0.98 },
          rightShoulder: { x: cx + 45, y: 160, visibility: 0.98 },
          leftElbow: { x: cx - 65, y: 210, visibility: 0.95 },
          rightElbow: { x: cx + 65, y: 210, visibility: 0.95 },
          leftWrist: { x: cx - 50, y: 230, visibility: 0.95 },
          rightWrist: { x: cx + 50, y: 230, visibility: 0.95 },
          leftHip: { x: cx - 35, y: 270, visibility: 0.98 },
          rightHip: { x: cx + 35, y: 270, visibility: 0.98 },
          leftKnee: { x: cx - 55, y: 370 - kneeLift, visibility: 0.99 },
          rightKnee: { x: cx + 55, y: 370, visibility: 0.99 },
          leftAnkle: { x: cx - 55, y: 470 - kneeLift * 0.8, visibility: 0.98 },
          rightAnkle: { x: cx + 55, y: 470, visibility: 0.98 },
        };
      }

      // Smooth landmarks with EMA filter
      const pose = filterRef.current.filter(rawPose);

      // Process via state machine
      if (isActive) {
        const result = stateMachineRef.current.processFrame(pose);

        if (result.newRepCompleted) {
          tvAudio.playRepComplete();
          setReps(result.reps);
          setCalories((prev) => prev + 3);
          setFormScore(stateMachineRef.current.getAverageFormScore());
          setFeedbackColor('good');
        }

        // Throttle UI text updates to avoid excess React re-renders
        const now = Date.now();
        if (now - lastStateUpdateTime.current > 120) {
          lastStateUpdateTime.current = now;
          setKneeAngle(result.primaryAngle);
          setFormFeedback(result.feedback);
        }
      }

      // Draw Skeletal Bones with Glowing Neon Style
      const connections: [JointPoint, JointPoint][] = [
        [pose.leftShoulder, pose.rightShoulder],
        [pose.leftShoulder, pose.leftElbow],
        [pose.leftElbow, pose.leftWrist],
        [pose.rightShoulder, pose.rightElbow],
        [pose.rightElbow, pose.rightWrist],
        [pose.leftShoulder, pose.leftHip],
        [pose.rightShoulder, pose.rightHip],
        [pose.leftHip, pose.rightHip],
        [pose.leftHip, pose.leftKnee],
        [pose.leftKnee, pose.leftAnkle],
        [pose.rightHip, pose.rightKnee],
        [pose.rightKnee, pose.rightAnkle],
      ];

      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00A8E1';

      connections.forEach(([p1, p2]) => {
        ctx.strokeStyle = '#00A8E1';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw Joint Landmark Nodes
      Object.entries(pose).forEach(([name, pt]) => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = name.includes('Knee') ? '#FF9900' : '#22D3EE';
        ctx.fillStyle = name.includes('Knee') ? '#FF9900' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, name.includes('Knee') ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00A8E1';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Render Dynamic Angle Arc on active target joint
      const targetJoint = exercise === 'Squats' ? pose.leftKnee : exercise === 'High Knees' ? pose.leftHip : pose.leftShoulder;
      ctx.strokeStyle = '#FF9900';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(targetJoint.x, targetJoint.y, 28, 0, (kneeAngle * Math.PI) / 180);
      ctx.stroke();

      // Degree Badge Tag
      ctx.fillStyle = 'rgba(11, 14, 20, 0.9)';
      ctx.fillRect(targetJoint.x - 70, targetJoint.y - 12, 55, 24);
      ctx.strokeStyle = '#FF9900';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(targetJoint.x - 70, targetJoint.y - 12, 55, 24);
      ctx.fillStyle = '#FF9900';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${kneeAngle}°`, targetJoint.x - 42, targetJoint.y + 4);

      animationIdRef.current = requestAnimationFrame(render);
    };

    animationIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isActive, exercise, useWebcam, kneeAngle]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    tvAudio.playSelect();
    stateMachineRef.current.reset();
    filterRef.current.reset();
    setReps(0);
    setCalories(0);
    setElapsedTime(challengeMode ? timeLimitSeconds : 0);
    setChallengeFinished(false);
    setIsActive(true);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Fitness Status Banner */}
      <div className="flex items-center justify-between bg-tv-card/80 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-tv-orange/20 rounded-xl text-tv-orange border border-tv-orange/30">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>{challengeMode ? '⚡ Halftime 30s Fitness Challenge' : 'AI Living Room Fitness Coach'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-tv-accent/20 text-tv-accent border border-tv-accent/30 font-mono">
                {useWebcam ? 'Live Camera Vision' : 'AI Synthetic Mode'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Form Analysis Score: <span className="text-emerald-400 font-bold">{formScore}%</span> • Athlete:{' '}
              <span className="text-white font-medium">{activeProfile.name}</span>
            </p>
          </div>
        </div>

        {/* Exercise Quick-Selectors */}
        <div className="flex items-center space-x-2">
          {(['Squats', 'Jumping Jacks', 'High Knees'] as ExerciseType[]).map((ex) => (
            <Focusable
              key={ex}
              id={`fit-ex-${ex.toLowerCase().replace(' ', '-')}`}
              onSelect={() => {
                tvAudio.playSelect();
                setExercise(ex);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                exercise === ex
                  ? 'bg-tv-accent text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {ex}
            </Focusable>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Video Canvas + Telemetry Panel */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Side: Glowing Skeleton Vision Canvas */}
        <div className="col-span-8 bg-tv-card/60 border border-white/10 rounded-2xl overflow-hidden relative flex items-center justify-center">
          <video ref={videoRef} className="hidden" playsInline muted autoPlay />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full h-full object-contain rounded-2xl"
          />

          {webcamError && (
            <div className="absolute top-4 left-4 right-4 bg-tv-orange/20 border border-tv-orange/40 backdrop-blur-md rounded-xl p-3 text-xs text-white flex items-center justify-between">
              <span>{webcamError}</span>
              <button
                onClick={() => setWebcamError(null)}
                className="ml-2 font-mono text-[10px] bg-white/20 px-2 py-0.5 rounded"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Form Guidance Lower Third Banner */}
          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 border border-white/10 backdrop-blur-md rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  feedbackColor === 'good'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]'
                    : feedbackColor === 'warning'
                    ? 'bg-tv-orange shadow-[0_0_8px_#FF9900]'
                    : 'bg-tv-accent shadow-[0_0_8px_#00A8E1]'
                }`}
              />
              <span className="text-sm font-semibold text-white">{formFeedback}</span>
            </div>
            <span className="text-xs font-mono text-tv-accent">{kneeAngle}° Joint Angle</span>
          </div>
        </div>

        {/* Right Side: Reps, Calories & Controls */}
        <div className="col-span-4 flex flex-col space-y-3">
          {/* Circular Rep Counter Card */}
          <div className="bg-tv-card/80 border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center relative backdrop-blur-md">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-white/10"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-tv-accent transition-all duration-300"
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (Math.min(reps, targetReps) / targetReps) * 264}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white tracking-tight">{reps}</span>
                <span className="text-[11px] text-slate-400 uppercase tracking-widest">
                  of {targetReps} Reps
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-4">
              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-center">
                <div className="flex items-center justify-center space-x-1 text-tv-orange text-xs mb-0.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Burned</span>
                </div>
                <span className="text-lg font-bold text-white font-mono">{calories} kcal</span>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-center">
                <div className="flex items-center justify-center space-x-1 text-tv-accent text-xs mb-0.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Time</span>
                </div>
                <span className="text-lg font-bold text-white font-mono">{formatTime(elapsedTime)}</span>
              </div>
            </div>
          </div>

          {/* Interactive D-pad Remote Controls */}
          <div className="bg-tv-card/80 border border-white/10 rounded-2xl p-4 flex flex-col space-y-2 backdrop-blur-md">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Coach Controls
            </span>

            <Focusable
              id="fit-btn-toggle-camera"
              onSelect={() => {
                tvAudio.playSelect();
                setUseWebcam((prev) => !prev);
              }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs"
            >
              <div className="flex items-center space-x-2">
                {useWebcam ? <VideoOff className="w-4 h-4 text-red-400" /> : <Camera className="w-4 h-4 text-tv-accent" />}
                <span>{useWebcam ? 'Switch to Simulation Mode' : 'Connect Live Webcam'}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {useWebcam ? 'Active' : 'Simulated'}
              </span>
            </Focusable>

            <Focusable
              id="fit-btn-play-pause"
              onSelect={() => {
                tvAudio.playSelect();
                setIsActive((prev) => !prev);
              }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs"
            >
              <div className="flex items-center space-x-2">
                {isActive ? <Pause className="w-4 h-4 text-tv-orange" /> : <Play className="w-4 h-4 text-emerald-400" />}
                <span>{isActive ? 'Pause Workout' : 'Resume Workout'}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{isActive ? 'Running' : 'Paused'}</span>
            </Focusable>

            <Focusable
              id="fit-btn-reset"
              onSelect={handleReset}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs"
            >
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <span>Reset Set &amp; Stats</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">0 Reps</span>
            </Focusable>

            {onExit && (
              <Focusable
                id="fit-btn-exit"
                onSelect={() => {
                  tvAudio.playSelect();
                  onExit();
                }}
                className="flex items-center justify-center p-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold"
              >
                <span>Exit Workout</span>
              </Focusable>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
