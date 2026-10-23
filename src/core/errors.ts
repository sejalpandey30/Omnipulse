export type AppErrorCode =
  | 'PERMISSION_DENIED'
  | 'DEVICE_UNAVAILABLE'
  | 'DEVICE_IN_USE'
  | 'SPEECH_UNSUPPORTED'
  | 'STORAGE_CORRUPT'
  | 'NAVIGATION_FAULT'
  | 'STREAM_TERMINATED';

export interface FallbackStrategy {
  userMessage: string;
  actionName: string;
  executeFallback: () => void;
}

export class OmniPulseError extends Error {
  public readonly code: AppErrorCode;
  public readonly module: string;
  public readonly recoveryHint: string;

  constructor(code: AppErrorCode, module: string, message: string, recoveryHint: string) {
    super(message);
    this.name = 'OmniPulseError';
    this.code = code;
    this.module = module;
    this.recoveryHint = recoveryHint;
  }
}

export function resolveErrorFallback(
  error: unknown,
  defaultModule: string = 'System'
): { code: AppErrorCode; message: string; hint: string } {
  if (error instanceof OmniPulseError) {
    return {
      code: error.code,
      message: error.message,
      hint: error.recoveryHint,
    };
  }

  const errStr = String(error).toLowerCase();
  if (errStr.includes('permission') || errStr.includes('notallowed')) {
    return {
      code: 'PERMISSION_DENIED',
      message: 'Access permission was denied.',
      hint: 'Simulation mode activated automatically as fallback.',
    };
  }

  if (errStr.includes('notfound') || errStr.includes('device')) {
    return {
      code: 'DEVICE_UNAVAILABLE',
      message: 'Required hardware sensor was not detected.',
      hint: 'Switched to synthetic sensor simulation.',
    };
  }

  if (errStr.includes('speech') || errStr.includes('webkitSpeechRecognition')) {
    return {
      code: 'SPEECH_UNSUPPORTED',
      message: 'Speech recognition is not supported in this runtime environment.',
      hint: 'Remote D-pad and gesture controls are active.',
    };
  }

  return {
    code: 'NAVIGATION_FAULT',
    message: error instanceof Error ? error.message : 'An unexpected error occurred in ' + defaultModule,
    hint: 'Press Back or select Retry to continue.',
  };
}
