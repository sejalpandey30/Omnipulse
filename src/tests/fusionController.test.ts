import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FusionController, FusedCommand } from '../core/fusionController';
import { tvAudio } from '../utils/sound';

describe('Multi-Modal Fusion Controller', () => {
  let fusion: FusionController;

  beforeEach(() => {
    fusion = new FusionController();
    vi.restoreAllMocks();
  });

  it('fuses voice "explain that" with a point gesture arriving within 1.5s', () => {
    const capturedList: FusedCommand[] = [];
    fusion.subscribe((cmd) => {
      capturedList.push(cmd);
    });

    // Voice triggers target requirement window
    fusion.onVoiceRecognized('explain that');
    expect(capturedList.length).toBe(0); // waiting for target

    // Point gesture arrives 200ms later
    fusion.onGestureDetected('POINT', 'left', 'Vinicius');
    expect(capturedList.length).toBe(1);
    expect(capturedList[0].source).toBe('FUSION');
    expect(capturedList[0].action).toBe('EXPLAIN');
    expect(capturedList[0].target).toBe('Vinicius');
  });

  it('cancels pending fusion window if no point target arrives within 1.5s', () => {
    vi.useFakeTimers();
    let hintReceived: string | null = null;
    fusion.subscribeHints((hint) => {
      hintReceived = hint;
    });

    fusion.onVoiceRecognized('explain that');
    expect(hintReceived).toContain('Point at a player');

    // Advance beyond 1500ms
    vi.advanceTimersByTime(1600);
    expect(hintReceived).toBeNull(); // cleared on timeout
    vi.useRealTimers();
  });

  it('mutes voice recognition if tvAudio is currently actively playing', () => {
    let captured: FusedCommand | null = null;
    fusion.subscribe((cmd) => {
      captured = cmd;
    });

    vi.spyOn(tvAudio, 'isAudioActive').mockReturnValue(true);

    fusion.onVoiceRecognized('pause');
    // Command must be dropped to prevent acoustic self-triggering
    expect(captured).toBeNull();
  });

  it('dispatches direct voice commands without target delay', () => {
    const capturedList: FusedCommand[] = [];
    fusion.subscribe((cmd) => {
      capturedList.push(cmd);
    });

    fusion.onVoiceRecognized('pause');
    expect(capturedList.length).toBe(1);
    expect(capturedList[0].action).toBe('PAUSE');
    expect(capturedList[0].source).toBe('VOICE');
  });
});
