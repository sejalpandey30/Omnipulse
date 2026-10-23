import { describe, it, expect } from 'vitest';
import { parseVoiceIntent, levenshteinDistance } from '../core/intentParser';

describe('Voice Intent Parser & Entity Extractor', () => {
  it('computes Levenshtein distance correctly', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('pause', 'paws')).toBe(2);
    expect(levenshteinDistance('explain', 'explian')).toBe(2);
  });

  it('identifies EXPLAIN intent with slot requirement', () => {
    const res = parseVoiceIntent('Can you explain that play?');
    expect(res.action).toBe('EXPLAIN');
    expect(res.slots.requiresTarget).toBe(true);
  });

  it('matches fuzzy typos using distance threshold', () => {
    const res = parseVoiceIntent('please explian the offside');
    expect(res.action).toBe('EXPLAIN');
  });

  it('extracts player entity slot correctly', () => {
    const res = parseVoiceIntent('Show me stats for Mbappé');
    expect(res.slots.player).toBe('Mbappé');
  });

  it('extracts team and exercise slots', () => {
    const res1 = parseVoiceIntent('What is Real Madrid score');
    expect(res1.slots.team).toBe('Real Madrid');

    const res2 = parseVoiceIntent('Let us start squats now');
    expect(res2.action).toBe('FITNESS');
    expect(res2.slots.exercise).toBe('Squats');
  });

  it('extracts trivia option letters', () => {
    const res = parseVoiceIntent('Select option B');
    expect(res.slots.answerOption).toBe(1);
  });
});
