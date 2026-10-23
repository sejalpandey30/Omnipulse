import { appLogger } from './logger';

export type MatchEventType = 'FOUL' | 'OFFSIDE' | 'GOAL' | 'HALFTIME' | 'LULL' | 'VAR_CHECK';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  time: number; // match minute
  players?: string[];
  explanation: {
    kid: string;
    casual: string;
    expert: string;
  };
  tacticalData?: {
    offsidePlayer?: string;
    foulCommittedBy?: string;
    goalScorer?: string;
    defendingLineX?: number;
    attackingPlayerX?: number;
    ballTargetX?: number;
    ballTargetY?: number;
    annotationType?: 'OFFSIDE_LINE' | 'FOUL_CIRCLE' | 'GOAL_TRAJECTORY' | 'VAR_BOX';
  };
}

export const EVENT_PRIORITIES: Record<MatchEventType, number> = {
  GOAL: 100,
  VAR_CHECK: 85,
  HALFTIME: 70,
  FOUL: 50,
  OFFSIDE: 45,
  LULL: 25,
};

export interface BusDebugTraceEntry {
  id: string;
  eventId: string;
  type: MatchEventType;
  action: 'PUBLISHED' | 'DROPPED_DUPLICATE' | 'DROPPED_COOLDOWN' | 'DROPPED_LOWER_PRIORITY';
  reason?: string;
  timestamp: number;
}

type EventListener = (event: MatchEvent) => void;
type TraceSubscriber = (trace: BusDebugTraceEntry) => void;

export class MatchEventBus {
  private listeners: Set<EventListener> = new Set();
  private eventHistory: MatchEvent[] = [];
  private maxHistory: number = 200;
  private seenIds: Set<string> = new Set();
  private lastEventTypeTime: Map<MatchEventType, number> = new Map();
  private lastEventTimestamp: number = 0;
  private currentActivePriority: number = 0;
  private cooldownMsPerType: Record<MatchEventType, number> = {
    GOAL: 3000,
    VAR_CHECK: 4000,
    HALFTIME: 15000,
    FOUL: 4000,
    OFFSIDE: 4000,
    LULL: 15000,
  };

  private traceLog: BusDebugTraceEntry[] = [];
  private maxTraceSize: number = 100;
  private traceSubscribers: Set<TraceSubscriber> = new Set();

  private isReplaying: boolean = false;
  private replayTimeoutIds: ReturnType<typeof setTimeout>[] = [];

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeTrace(subscriber: TraceSubscriber): () => void {
    this.traceSubscribers.add(subscriber);
    return () => {
      this.traceSubscribers.delete(subscriber);
    };
  }

  private logTrace(
    eventId: string,
    type: MatchEventType,
    action: BusDebugTraceEntry['action'],
    reason?: string
  ): void {
    const entry: BusDebugTraceEntry = {
      id: `trace-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      type,
      action,
      reason,
      timestamp: Date.now(),
    };
    this.traceLog.unshift(entry);
    if (this.traceLog.length > this.maxTraceSize) {
      this.traceLog.pop();
    }
    this.traceSubscribers.forEach((sub) => {
      try {
        sub(entry);
      } catch {}
    });
  }

  public publish(event: MatchEvent): boolean {
    const now = Date.now();
    const eventPriority = EVENT_PRIORITIES[event.type] || 30;

    // 1. Deduplication by ID
    if (this.seenIds.has(event.id)) {
      this.logTrace(event.id, event.type, 'DROPPED_DUPLICATE', 'Event ID already processed');
      appLogger.warn('EventBus', `Dropped duplicate event ${event.id}`);
      return false;
    }

    // 2. Cooldown check per event type (prevent event spamming)
    const lastTypeTime = this.lastEventTypeTime.get(event.type) || 0;
    const cooldownNeeded = this.cooldownMsPerType[event.type] || 3000;
    if (now - lastTypeTime < cooldownNeeded) {
      this.logTrace(
        event.id,
        event.type,
        'DROPPED_COOLDOWN',
        `Cooldown of ${cooldownNeeded}ms active for ${event.type}`
      );
      appLogger.info('EventBus', `Dropped event ${event.type} due to cooldown`);
      return false;
    }

    // 3. Global priority check within active burst window (1.5 seconds)
    if (now - this.lastEventTimestamp < 1500 && eventPriority < this.currentActivePriority) {
      this.logTrace(
        event.id,
        event.type,
        'DROPPED_LOWER_PRIORITY',
        `Outranked by priority ${this.currentActivePriority}`
      );
      appLogger.info('EventBus', `Dropped lower-priority event ${event.type}`);
      return false;
    }

    // Accepted event
    this.seenIds.add(event.id);
    if (this.seenIds.size > 500) {
      // Bounded set
      const firstItems = Array.from(this.seenIds).slice(0, 250);
      firstItems.forEach((id) => this.seenIds.delete(id));
    }

    this.lastEventTypeTime.set(event.type, now);
    this.lastEventTimestamp = now;
    this.currentActivePriority = eventPriority;

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    this.logTrace(event.id, event.type, 'PUBLISHED');
    appLogger.info('EventBus', `Published ${event.type} (${event.id})`);

    // Notify listeners defensively
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        appLogger.error('EventBus', 'Error in match event listener', { err: String(err) });
      }
    });

    return true;
  }

  public getHistory(): MatchEvent[] {
    return [...this.eventHistory];
  }

  public getLatest(): MatchEvent | null {
    return this.eventHistory[0] || null;
  }

  public getTrace(): BusDebugTraceEntry[] {
    return [...this.traceLog];
  }

  public clearHistory(): void {
    this.eventHistory = [];
    this.seenIds.clear();
    this.lastEventTypeTime.clear();
    this.currentActivePriority = 0;
  }

  // Deterministic Sequence Replayer for Demos & Testing
  public replaySequence(
    sequence: Array<{ delayMs: number; event: MatchEvent }>,
    onComplete?: () => void
  ): void {
    this.stopReplay();
    this.isReplaying = true;

    let cumulativeDelay = 0;
    sequence.forEach((item, index) => {
      cumulativeDelay += item.delayMs;
      const tid = setTimeout(() => {
        this.publish(item.event);
        if (index === sequence.length - 1) {
          this.isReplaying = false;
          onComplete?.();
        }
      }, cumulativeDelay);
      this.replayTimeoutIds.push(tid);
    });
  }

  public stopReplay(): void {
    this.replayTimeoutIds.forEach((tid) => clearTimeout(tid));
    this.replayTimeoutIds = [];
    this.isReplaying = false;
  }

  public isReplayActive(): boolean {
    return this.isReplaying;
  }
}

export const matchEventBus = new MatchEventBus();
