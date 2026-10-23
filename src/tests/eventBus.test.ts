import { describe, it, expect, beforeEach } from 'vitest';
import { MatchEventBus, MatchEvent } from '../core/matchEventBus';

describe('MatchEventBus Engine', () => {
  let bus: MatchEventBus;

  const mockEvent = (id: string, type: MatchEvent['type'], time = 50): MatchEvent => ({
    id,
    type,
    time,
    explanation: { kid: 'k', casual: 'c', expert: 'e' },
  });

  beforeEach(() => {
    bus = new MatchEventBus();
  });

  it('delivers events to subscribers and respects unsubscribe callback', () => {
    const receivedList: MatchEvent[] = [];
    const unsub = bus.subscribe((evt) => {
      receivedList.push(evt);
    });

    const evt1 = mockEvent('e1', 'GOAL');
    const accepted = bus.publish(evt1);
    expect(accepted).toBe(true);
    expect(receivedList.length).toBe(1);
    expect(receivedList[0].id).toBe('e1');

    unsub();
    const evt2 = mockEvent('e2', 'VAR_CHECK');
    bus.publish(evt2);
    // receivedList should not grow after unsubscription
    expect(receivedList.length).toBe(1);
  });

  it('deduplicates events with identical IDs', () => {
    const evt = mockEvent('dup-123', 'FOUL');
    const first = bus.publish(evt);
    const second = bus.publish(evt);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(bus.getHistory().length).toBe(1);
  });

  it('enforces cooldown per event type to prevent stacking', () => {
    const evt1 = mockEvent('foul-1', 'FOUL');
    const evt2 = mockEvent('foul-2', 'FOUL');

    const accepted1 = bus.publish(evt1);
    const accepted2 = bus.publish(evt2);

    expect(accepted1).toBe(true);
    // Same type within 4s cooldown should be rejected
    expect(accepted2).toBe(false);
    expect(bus.getHistory().length).toBe(1);
  });

  it('drops lower-priority events during an active high-priority burst', () => {
    const goal = mockEvent('goal-burst', 'GOAL'); // Priority 100
    const foul = mockEvent('foul-burst', 'FOUL'); // Priority 50

    const acceptedGoal = bus.publish(goal);
    const acceptedFoul = bus.publish(foul);

    expect(acceptedGoal).toBe(true);
    // Lower priority within burst window should be dropped
    expect(acceptedFoul).toBe(false);
  });

  it('records debug trace for accepted and dropped events', () => {
    bus.publish(mockEvent('trace-goal', 'GOAL'));
    bus.publish(mockEvent('trace-goal', 'GOAL')); // duplicate

    const trace = bus.getTrace();
    expect(trace.length).toBe(2);
    expect(trace[0].action).toBe('DROPPED_DUPLICATE');
    expect(trace[1].action).toBe('PUBLISHED');
  });
});
