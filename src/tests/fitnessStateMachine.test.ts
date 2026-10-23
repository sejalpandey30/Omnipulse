import { describe, it, expect, beforeEach } from 'vitest';
import {
  RepStateMachine,
  LandmarkFilter,
  SkeletonPose,
  JointPoint,
  calculateJointAngle,
} from '../components/fitness/fitnessPipeline';

describe('Fitness Pipeline: Math, Landmark Filter & State Machine', () => {
  const createMockPose = (kneeAngleDeg: number): SkeletonPose => {
    // Generate 2D triangle: Hip at (100, 100), Knee at (100, 200), Ankle rotated by kneeAngle
    const rad = ((180 - kneeAngleDeg) * Math.PI) / 180;
    const ankleX = 100 + Math.sin(rad) * 100;
    const ankleY = 200 + Math.cos(rad) * 100;

    const dummyJoint: JointPoint = { x: 100, y: 50, visibility: 0.99 };

    return {
      nose: dummyJoint,
      leftShoulder: dummyJoint,
      rightShoulder: dummyJoint,
      leftElbow: dummyJoint,
      rightElbow: dummyJoint,
      leftWrist: dummyJoint,
      rightWrist: dummyJoint,
      leftHip: { x: 100, y: 100, visibility: 0.99 },
      rightHip: { x: 100, y: 100, visibility: 0.99 },
      leftKnee: { x: 100, y: 200, visibility: 0.99 },
      rightKnee: { x: 100, y: 200, visibility: 0.99 },
      leftAnkle: { x: ankleX, y: ankleY, visibility: 0.99 },
      rightAnkle: { x: ankleX, y: ankleY, visibility: 0.99 },
    };
  };

  it('calculates joint angle accurately', () => {
    const a: JointPoint = { x: 100, y: 100, visibility: 1.0 };
    const b: JointPoint = { x: 100, y: 200, visibility: 1.0 };
    const c: JointPoint = { x: 200, y: 200, visibility: 1.0 };

    // 90 degree angle between vertical (100,100)-(100,200) and horizontal (100,200)-(200,200)
    const angle = calculateJointAngle(a, b, c);
    expect(Math.round(angle)).toBe(90);
  });

  it('filters noisy jitter via LandmarkFilter EMA', () => {
    const filter = new LandmarkFilter(0.4);
    const p1 = createMockPose(170);
    const p2Jitter = createMockPose(120); // sudden instantaneous 50-degree spike

    filter.filter(p1);
    const smoothed = filter.filter(p2Jitter);

    // Smoothed ankle position should be dampened between p1 and p2
    expect(smoothed.leftAnkle.x).toBeGreaterThan(p1.leftAnkle.x);
    expect(smoothed.leftAnkle.x).toBeLessThan(p2Jitter.leftAnkle.x);
  });

  it('counts exactly 1 rep for a full squat and rejects jitter/bounce double-counts', () => {
    const sm = new RepStateMachine('Squats');
    let currentTime = 1000;

    // Phase 1: Standing tall (170 deg)
    sm.processFrame(createMockPose(170), currentTime);

    // Phase 2: Descending into squat (140 -> 115 -> 95 deg)
    currentTime += 300;
    sm.processFrame(createMockPose(140), currentTime);
    currentTime += 300;
    sm.processFrame(createMockPose(115), currentTime);
    currentTime += 300;
    sm.processFrame(createMockPose(95), currentTime); // bottom reached (<105 deg)

    // Jitter noise at the bottom (95 -> 98 -> 94 -> 97 deg) - MUST NOT TRIGGER NEW REPS
    currentTime += 50;
    sm.processFrame(createMockPose(98), currentTime);
    currentTime += 50;
    sm.processFrame(createMockPose(94), currentTime);
    currentTime += 50;
    sm.processFrame(createMockPose(97), currentTime);

    // Phase 3: Ascending (120 -> 145 -> 165 deg)
    currentTime += 400;
    sm.processFrame(createMockPose(120), currentTime);
    currentTime += 300;
    sm.processFrame(createMockPose(145), currentTime);
    currentTime += 300;
    const finalFrame = sm.processFrame(createMockPose(165), currentTime);

    // Total elapsed: ~2000ms. Exactly ONE clean rep should be counted.
    expect(finalFrame.reps).toBe(1);
    expect(finalFrame.newRepCompleted).toBe(true);
    expect(finalFrame.analysis).toBeDefined();
    expect(finalFrame.analysis?.depthScore).toBeGreaterThanOrEqual(80);
  });

  it('rejects reps that happen faster than minRepDurationMs (e.g. tracking glitch)', () => {
    const sm = new RepStateMachine('Squats');
    let currentTime = 1000;

    sm.processFrame(createMockPose(170), currentTime);
    currentTime += 50;
    sm.processFrame(createMockPose(90), currentTime);
    currentTime += 50;
    const result = sm.processFrame(createMockPose(165), currentTime);

    // 100ms total duration is physically impossible for a squat -> rejected by minRepDurationMs (600ms)
    expect(result.reps).toBe(0);
    expect(result.newRepCompleted).toBe(false);
  });
});
