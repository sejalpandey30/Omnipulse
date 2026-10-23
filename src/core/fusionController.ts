import { GestureType, ScreenQuadrant, OpticalGestureClassifier, GestureEvent } from './gestureClassifier';
import { parseVoiceIntent, ParsedVoiceIntent } from './intentParser';
import { appLogger } from './logger';
import { tvAudio } from '../utils/sound';

export type { GestureType, ScreenQuadrant };

export interface FusedCommand {
  id: string;
  action: 'EXPLAIN' | 'PAUSE' | 'RESUME' | 'SHOW_MY_TEAM' | 'REPLAY' | 'FITNESS' | 'TRIVIA' | 'NAVIGATE';
  source: 'FUSION' | 'VOICE' | 'GESTURE';
  spokenText?: string;
  gesture?: GestureType;
  speakerSide?: ScreenQuadrant;
  estimatedProfileId?: string;
  target?: string;
  timestamp: number;
}

type FusedCommandListener = (cmd: FusedCommand) => void;

export class FusionController {
  private listeners: Set<FusedCommandListener> = new Set();
  private recentGesture: { type: GestureType; side: ScreenQuadrant; timestamp: number; target?: string } | null = null;
  private adaptiveHintListeners: Set<(hint: string | null) => void> = new Set();
  private dpadStallCount: number = 0;
  private classifier: OpticalGestureClassifier = new OpticalGestureClassifier();

  // Fusion Window pending state (for commands like "explain that" requiring a pointer target)
  private pendingTargetVoiceIntent: {
    intent: ParsedVoiceIntent;
    timestamp: number;
    timerId: ReturnType<typeof setTimeout>;
    promptedClarification: boolean;
  } | null = null;

  public subscribe(listener: FusedCommandListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeHints(listener: (hint: string | null) => void): () => void {
    this.adaptiveHintListeners.add(listener);
    return () => {
      this.adaptiveHintListeners.delete(listener);
    };
  }

  // Register optical gesture input
  public onGestureDetected(
    type: GestureType,
    side: ScreenQuadrant = 'center',
    target?: string
  ): void {
    const now = Date.now();
    this.recentGesture = { type, side, timestamp: now, target };

    // Check if an existing voice intent is waiting in the 1.5s fusion window!
    if (this.pendingTargetVoiceIntent && type === 'POINT') {
      clearTimeout(this.pendingTargetVoiceIntent.timerId);
      const pending = this.pendingTargetVoiceIntent;
      this.pendingTargetVoiceIntent = null;

      appLogger.info('Fusion', 'Successfully fused pending voice command with point target', {
        voice: pending.intent.raw,
        target: target || 'selected-node',
      });

      this.emit({
        id: `fused-${now}`,
        action: 'EXPLAIN',
        source: 'FUSION',
        spokenText: pending.intent.raw,
        gesture: 'POINT',
        speakerSide: side,
        target: target || 'active-player',
        estimatedProfileId: this.mapSideToProfile(side),
        timestamp: now,
      });
      return;
    }

    // Direct gesture mapping if not combined with voice
    if (type === 'OPEN_PALM') {
      this.emit({
        id: `fused-${now}`,
        action: 'PAUSE',
        source: 'GESTURE',
        gesture: type,
        speakerSide: side,
        timestamp: now,
      });
    } else if (type === 'SWIPE_RIGHT') {
      this.emit({
        id: `fused-${now}`,
        action: 'NAVIGATE',
        target: 'sports',
        source: 'GESTURE',
        gesture: type,
        speakerSide: side,
        timestamp: now,
      });
    } else if (type === 'THUMBS_UP') {
      this.emit({
        id: `fused-${now}`,
        action: 'RESUME',
        source: 'GESTURE',
        gesture: type,
        speakerSide: side,
        timestamp: now,
      });
    }
  }

  // Register voice input and evaluate multi-modal fusion
  public onVoiceRecognized(rawText: string): void {
    // 1. Acoustic Echo Cancellation Guard: Don't process input if the app is currently outputting sound
    if (tvAudio.isAudioActive()) {
      appLogger.debug('Fusion', 'Muted incoming speech recognition result due to active speaker output', {
        raw: rawText,
      });
      return;
    }

    const intent = parseVoiceIntent(rawText);
    const now = Date.now();
    appLogger.info('Fusion', `Parsed voice intent: ${intent.action}`, { raw: rawText, slots: intent.slots });

    if (intent.action === 'UNKNOWN') {
      return;
    }

    // Check recent gesture window (1.5 seconds)
    const hasRecentPoint =
      this.recentGesture &&
      this.recentGesture.type === 'POINT' &&
      now - this.recentGesture.timestamp < 1500;

    const speakerSide = this.recentGesture?.side || 'center';
    const estimatedProfileId = this.mapSideToProfile(speakerSide);

    // If command requires a target (e.g. "explain that") and no recent point exists, enter 1.5s fusion wait window
    if (intent.action === 'EXPLAIN' && intent.slots.requiresTarget && !hasRecentPoint) {
      if (this.pendingTargetVoiceIntent) {
        clearTimeout(this.pendingTargetVoiceIntent.timerId);
      }

      this.emitHint('👉 Point at a player on screen, or say "Explain offside"');

      const timerId = setTimeout(() => {
        if (this.pendingTargetVoiceIntent) {
          appLogger.info('Fusion', 'Fusion target window timed out without gesture target; cancelling');
          this.emitHint(null);
          this.pendingTargetVoiceIntent = null;
        }
      }, 1500);

      this.pendingTargetVoiceIntent = {
        intent,
        timestamp: now,
        timerId,
        promptedClarification: true,
      };
      return;
    }

    // Immediate dispatch
    const target = intent.slots.player || this.recentGesture?.target;

    this.emit({
      id: `fused-${now}`,
      action: intent.action as FusedCommand['action'],
      source: hasRecentPoint ? 'FUSION' : 'VOICE',
      spokenText: rawText,
      gesture: hasRecentPoint ? 'POINT' : undefined,
      speakerSide,
      estimatedProfileId,
      target,
      timestamp: now,
    });
  }

  private mapSideToProfile(side: ScreenQuadrant): string {
    if (side === 'left') return 'dad';
    if (side === 'right') return 'mom';
    return 'kid';
  }

  public recordDpadActivity(success: boolean): void {
    this.classifier.recordRemoteInput();
    if (!success) {
      this.dpadStallCount++;
      if (this.dpadStallCount >= 4) {
        this.emitHint('💡 Tip: Try saying "Explain that" or use voice controls!');
      }
    } else {
      this.dpadStallCount = 0;
    }
  }

  public recordHighAudioNoise(): void {
    this.emitHint('💡 High room audio detected: Use hand gestures (✋ Open Palm to pause)!');
  }

  private emit(cmd: FusedCommand): void {
    appLogger.info('Fusion', `Dispatched fused action: ${cmd.action} via ${cmd.source}`);
    this.listeners.forEach((listener) => {
      try {
        listener(cmd);
      } catch (e) {
        appLogger.error('Fusion', 'Error in fusion command listener', { err: String(e) });
      }
    });
  }

  private emitHint(hint: string | null): void {
    this.adaptiveHintListeners.forEach((l) => l(hint));
  }

  public clearPending(): void {
    if (this.pendingTargetVoiceIntent) {
      clearTimeout(this.pendingTargetVoiceIntent.timerId);
      this.pendingTargetVoiceIntent = null;
    }
  }
}

export const fusionController = new FusionController();
