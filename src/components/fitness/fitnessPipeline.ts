export interface JointPoint {
  x: number;
  y: number;
  visibility: number; // confidence 0..1
}

export interface SkeletonPose {
  nose: JointPoint;
  leftShoulder: JointPoint;
  rightShoulder: JointPoint;
  leftElbow: JointPoint;
  rightElbow: JointPoint;
  leftWrist: JointPoint;
  rightWrist: JointPoint;
  leftHip: JointPoint;
  rightHip: JointPoint;
  leftKnee: JointPoint;
  rightKnee: JointPoint;
  leftAnkle: JointPoint;
  rightAnkle: JointPoint;
}

export type ExerciseType = 'Squats' | 'Jumping Jacks' | 'High Knees';

export type RepPhase = 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING' | 'PEAK';

export interface ExerciseDefinition {
  name: ExerciseType;
  primaryAngle: (pose: SkeletonPose) => number;
  secondaryAngle?: (pose: SkeletonPose) => number;
  // Thresholds for state transitions
  topThreshold: number; // e.g. 160 deg for knee standing
  bottomThreshold: number; // e.g. 100 deg for squat bottom
  minRepDurationMs: number;
  idealDepthAngle: number;
  cues: {
    tooShallow: string;
    goodDepth: string;
    asymmetric: string;
    tooFast: string;
    ready: string;
  };
}

export interface RepFormAnalysis {
  repNumber: number;
  depthScore: number;
  symmetryScore: number;
  tempoScore: number;
  compositeScore: number;
  durationMs: number;
  feedback: string;
}

// Calculate angle between three 2D points: A - B (vertex) - C
export function calculateJointAngle(a: JointPoint, b: JointPoint, c: JointPoint): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return angle;
}

// Exponential Moving Average filter for landmarks
export class LandmarkFilter {
  private alpha: number;
  private prevPose: SkeletonPose | null = null;

  constructor(alpha: number = 0.45) {
    this.alpha = alpha;
  }

  public filter(raw: SkeletonPose): SkeletonPose {
    if (!this.prevPose) {
      this.prevPose = raw;
      return raw;
    }

    const smoothJoint = (curr: JointPoint, prev: JointPoint): JointPoint => {
      // If low confidence, lean more on previous valid position
      const effectiveAlpha = curr.visibility < 0.4 ? 0.05 : this.alpha;
      return {
        x: prev.x + effectiveAlpha * (curr.x - prev.x),
        y: prev.y + effectiveAlpha * (curr.y - prev.y),
        visibility: curr.visibility,
      };
    };

    const smoothed: SkeletonPose = {
      nose: smoothJoint(raw.nose, this.prevPose.nose),
      leftShoulder: smoothJoint(raw.leftShoulder, this.prevPose.leftShoulder),
      rightShoulder: smoothJoint(raw.rightShoulder, this.prevPose.rightShoulder),
      leftElbow: smoothJoint(raw.leftElbow, this.prevPose.leftElbow),
      rightElbow: smoothJoint(raw.rightElbow, this.prevPose.rightElbow),
      leftWrist: smoothJoint(raw.leftWrist, this.prevPose.leftWrist),
      rightWrist: smoothJoint(raw.rightWrist, this.prevPose.rightWrist),
      leftHip: smoothJoint(raw.leftHip, this.prevPose.leftHip),
      rightHip: smoothJoint(raw.rightHip, this.prevPose.rightHip),
      leftKnee: smoothJoint(raw.leftKnee, this.prevPose.leftKnee),
      rightKnee: smoothJoint(raw.rightKnee, this.prevPose.rightKnee),
      leftAnkle: smoothJoint(raw.leftAnkle, this.prevPose.leftAnkle),
      rightAnkle: smoothJoint(raw.rightAnkle, this.prevPose.rightAnkle),
    };

    this.prevPose = smoothed;
    return smoothed;
  }

  public reset(): void {
    this.prevPose = null;
  }
}

// Exercise Definitions
export const EXERCISE_DEFINITIONS: Record<ExerciseType, ExerciseDefinition> = {
  Squats: {
    name: 'Squats',
    primaryAngle: (pose) => {
      const leftKnee = calculateJointAngle(pose.leftHip, pose.leftKnee, pose.leftAnkle);
      const rightKnee = calculateJointAngle(pose.rightHip, pose.rightKnee, pose.rightAnkle);
      return (leftKnee + rightKnee) / 2;
    },
    secondaryAngle: (pose) => {
      return Math.abs(
        calculateJointAngle(pose.leftHip, pose.leftKnee, pose.leftAnkle) -
          calculateJointAngle(pose.rightHip, pose.rightKnee, pose.rightAnkle)
      );
    },
    topThreshold: 155, // standing straight
    bottomThreshold: 105, // deep parallel squat
    minRepDurationMs: 600, // anti-jitter
    idealDepthAngle: 90,
    cues: {
      tooShallow: 'Go a bit deeper for full activation!',
      goodDepth: 'Great depth! Drive through heels!',
      asymmetric: 'Keep weight balanced across both legs!',
      tooFast: 'Control the descent — steady cadence!',
      ready: 'Stand tall facing screen to begin squats',
    },
  },
  'Jumping Jacks': {
    name: 'Jumping Jacks',
    primaryAngle: (pose) => {
      // Shoulder abduction angle
      const leftArm = calculateJointAngle(pose.leftHip, pose.leftShoulder, pose.leftWrist);
      const rightArm = calculateJointAngle(pose.rightHip, pose.rightShoulder, pose.rightWrist);
      return (leftArm + rightArm) / 2;
    },
    topThreshold: 45, // arms down at sides
    bottomThreshold: 135, // arms overhead
    minRepDurationMs: 500,
    idealDepthAngle: 150,
    cues: {
      tooShallow: 'Reach higher overhead!',
      goodDepth: 'Excellent extension and tempo!',
      asymmetric: 'Raise both arms together!',
      tooFast: 'Maintain a steady rhythmic pace!',
      ready: 'Arms at your side ready for Jumping Jacks',
    },
  },
  'High Knees': {
    name: 'High Knees',
    primaryAngle: (pose) => {
      const leftHipAngle = calculateJointAngle(pose.leftShoulder, pose.leftHip, pose.leftKnee);
      const rightHipAngle = calculateJointAngle(pose.rightShoulder, pose.rightHip, pose.rightKnee);
      return Math.min(leftHipAngle, rightHipAngle);
    },
    topThreshold: 160,
    bottomThreshold: 105,
    minRepDurationMs: 400,
    idealDepthAngle: 90,
    cues: {
      tooShallow: 'Drive knees up to hip height!',
      goodDepth: 'Powerful knee drive!',
      asymmetric: 'Alternate knees evenly!',
      tooFast: 'Stay tall and controlled!',
      ready: 'Jog lightly in place, drive knees up',
    },
  },
};

// Robust Rep Counting State Machine
export class RepStateMachine {
  private def: ExerciseDefinition;
  private phase: RepPhase = 'STANDING';
  private repCount: number = 0;
  private repStartTime: number = 0;
  private minAngleAchieved: number = 180;
  private maxSymmetryDelta: number = 0;
  private recentReps: RepFormAnalysis[] = [];

  constructor(exercise: ExerciseType) {
    this.def = EXERCISE_DEFINITIONS[exercise];
  }

  public setExercise(exercise: ExerciseType): void {
    this.def = EXERCISE_DEFINITIONS[exercise];
    this.reset();
  }

  public reset(): void {
    this.phase = 'STANDING';
    this.repCount = 0;
    this.repStartTime = 0;
    this.minAngleAchieved = 180;
    this.maxSymmetryDelta = 0;
    this.recentReps = [];
  }

  public processFrame(
    pose: SkeletonPose,
    now: number = Date.now()
  ): {
    reps: number;
    phase: RepPhase;
    primaryAngle: number;
    feedback: string;
    newRepCompleted: boolean;
    analysis?: RepFormAnalysis;
  } {
    const angle = this.def.primaryAngle(pose);
    const symmetryDelta = this.def.secondaryAngle ? this.def.secondaryAngle(pose) : 0;
    let newRepCompleted = false;
    let completedAnalysis: RepFormAnalysis | undefined;
    let feedback = this.def.cues.ready;

    switch (this.phase) {
      case 'STANDING': {
        // Hysteresis threshold to start descent
        if (angle < this.def.topThreshold - 10) {
          this.phase = 'DESCENDING';
          this.repStartTime = now;
          this.minAngleAchieved = angle;
          this.maxSymmetryDelta = symmetryDelta;
        }
        break;
      }

      case 'DESCENDING': {
        if (angle < this.minAngleAchieved) {
          this.minAngleAchieved = angle;
        }
        if (symmetryDelta > this.maxSymmetryDelta) {
          this.maxSymmetryDelta = symmetryDelta;
        }

        if (angle <= this.def.bottomThreshold) {
          this.phase = 'BOTTOM';
        } else if (angle > this.def.topThreshold) {
          // Aborted attempt
          this.phase = 'STANDING';
        }
        break;
      }

      case 'BOTTOM': {
        if (angle < this.minAngleAchieved) {
          this.minAngleAchieved = angle;
        }
        // Hysteresis threshold to start ascent
        if (angle > this.def.bottomThreshold + 8) {
          this.phase = 'ASCENDING';
        }
        break;
      }

      case 'ASCENDING': {
        if (angle >= this.def.topThreshold - 5) {
          const duration = now - this.repStartTime;

          // Reject jitter reps that finish impossibly fast
          if (duration >= this.def.minRepDurationMs) {
            this.repCount++;
            newRepCompleted = true;

            // Form Scoring calculation
            const depthDiff = Math.max(0, this.minAngleAchieved - this.def.idealDepthAngle);
            const depthScore = Math.max(30, Math.round(100 - depthDiff * 1.5));
            const symmetryScore = Math.max(40, Math.round(100 - this.maxSymmetryDelta * 2));
            const tempoScore = duration > 900 && duration < 3500 ? 95 : 75;
            const composite = Math.round(depthScore * 0.5 + symmetryScore * 0.3 + tempoScore * 0.2);

            let cue = this.def.cues.goodDepth;
            if (depthScore < 70) cue = this.def.cues.tooShallow;
            else if (symmetryScore < 70) cue = this.def.cues.asymmetric;

            completedAnalysis = {
              repNumber: this.repCount,
              depthScore,
              symmetryScore,
              tempoScore,
              compositeScore: composite,
              durationMs: duration,
              feedback: cue,
            };
            this.recentReps.push(completedAnalysis);
            feedback = cue;
          }

          this.phase = 'STANDING';
          this.minAngleAchieved = 180;
          this.maxSymmetryDelta = 0;
        }
        break;
      }
    }

    return {
      reps: this.repCount,
      phase: this.phase,
      primaryAngle: Math.round(angle),
      feedback,
      newRepCompleted,
      analysis: completedAnalysis,
    };
  }

  public getAverageFormScore(): number {
    if (this.recentReps.length === 0) return 85;
    const total = this.recentReps.reduce((acc, r) => acc + r.compositeScore, 0);
    return Math.round(total / this.recentReps.length);
  }
}
