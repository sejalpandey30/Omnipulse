export type GestureType = 'POINT' | 'OPEN_PALM' | 'SWIPE_LEFT' | 'SWIPE_RIGHT' | 'THUMBS_UP';
export type ScreenQuadrant = 'left' | 'center' | 'right';

export interface GestureEvent {
  id: string;
  type: GestureType;
  confidence: number;
  quadrant: ScreenQuadrant;
  timestamp: number;
  velocity?: { x: number; y: number };
}

interface GestureWindowSample {
  x: number;
  y: number;
  time: number;
}

export class OpticalGestureClassifier {
  private windowSamples: GestureWindowSample[] = [];
  private maxSamples: number = 6;
  private lastFiredTime: Map<GestureType, number> = new Map();
  private palmHoldStartTime: number = 0;
  private lastRemoteInputTime: number = 0;

  private gestureCooldowns: Record<GestureType, number> = {
    POINT: 600,
    OPEN_PALM: 1200,
    SWIPE_LEFT: 800,
    SWIPE_RIGHT: 800,
    THUMBS_UP: 1000,
  };

  public recordRemoteInput(): void {
    this.lastRemoteInputTime = Date.now();
  }

  public processHandFrame(
    detectedType: GestureType | null,
    handX: number, // 0..1 normalized screen coordinate
    handY: number,
    confidence: number = 0.9,
    now: number = Date.now()
  ): GestureEvent | null {
    // 1. Conflict suppression: If remote/D-pad was used in the last 500ms, ignore gesture
    if (now - this.lastRemoteInputTime < 500) {
      return null;
    }

    // 2. Minimum confidence threshold
    if (confidence < 0.65) {
      return null;
    }

    // Determine screen quadrant from hand position
    const quadrant: ScreenQuadrant = handX < 0.35 ? 'left' : handX > 0.65 ? 'right' : 'center';

    // 3. Track motion sliding window for swipe velocity
    this.windowSamples.push({ x: handX, y: handY, time: now });
    if (this.windowSamples.length > this.maxSamples) {
      this.windowSamples.shift();
    }

    // Check for velocity-based swipes over the sliding window
    if (this.windowSamples.length >= 4) {
      const first = this.windowSamples[0];
      const last = this.windowSamples[this.windowSamples.length - 1];
      const dt = (last.time - first.time) / 1000; // in seconds
      const dx = last.x - first.x;
      const vx = dx / (dt || 0.001);

      // Fast horizontal displacement: vx > 0.9 screen-widths/sec
      if (vx > 0.9 && Math.abs(dx) > 0.15) {
        if (this.isCooldownReady('SWIPE_RIGHT', now)) {
          this.windowSamples = [];
          this.lastFiredTime.set('SWIPE_RIGHT', now);
          return {
            id: `gest-${now}`,
            type: 'SWIPE_RIGHT',
            confidence: 0.92,
            quadrant,
            timestamp: now,
            velocity: { x: vx, y: 0 },
          };
        }
      } else if (vx < -0.9 && Math.abs(dx) > 0.15) {
        if (this.isCooldownReady('SWIPE_LEFT', now)) {
          this.windowSamples = [];
          this.lastFiredTime.set('SWIPE_LEFT', now);
          return {
            id: `gest-${now}`,
            type: 'SWIPE_LEFT',
            confidence: 0.92,
            quadrant,
            timestamp: now,
            velocity: { x: vx, y: 0 },
          };
        }
      }
    }

    if (!detectedType) {
      this.palmHoldStartTime = 0;
      return null;
    }

    // 4. Hold-time requirement for destructive/pause action (OPEN_PALM)
    if (detectedType === 'OPEN_PALM') {
      if (this.palmHoldStartTime === 0) {
        this.palmHoldStartTime = now;
        return null;
      }
      // Must hold for at least 300ms
      if (now - this.palmHoldStartTime < 300) {
        return null;
      }
    } else {
      this.palmHoldStartTime = 0;
    }

    // 5. Per-gesture cooldown
    if (!this.isCooldownReady(detectedType, now)) {
      return null;
    }

    this.lastFiredTime.set(detectedType, now);
    return {
      id: `gest-${now}`,
      type: detectedType,
      confidence,
      quadrant,
      timestamp: now,
    };
  }

  private isCooldownReady(type: GestureType, now: number): boolean {
    const last = this.lastFiredTime.get(type) || 0;
    const cooldown = this.gestureCooldowns[type] || 600;
    return now - last >= cooldown;
  }

  public reset(): void {
    this.windowSamples = [];
    this.lastFiredTime.clear();
    this.palmHoldStartTime = 0;
  }
}
