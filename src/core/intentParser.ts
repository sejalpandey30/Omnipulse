export type ParsedIntentAction =
  | 'EXPLAIN'
  | 'PAUSE'
  | 'RESUME'
  | 'REPLAY'
  | 'SHOW_MY_TEAM'
  | 'FITNESS'
  | 'TRIVIA'
  | 'NAVIGATE'
  | 'UNKNOWN';

export interface ExtractedSlots {
  player?: string;
  team?: string;
  exercise?: 'Squats' | 'Jumping Jacks' | 'High Knees';
  answerOption?: number; // 0..3 (A..D)
  requiresTarget: boolean; // e.g. "explain that"
}

export interface ParsedVoiceIntent {
  raw: string;
  normalized: string;
  action: ParsedIntentAction;
  confidence: number;
  slots: ExtractedSlots;
}

// Compute Levenshtein distance between two strings
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

const SYNONYMS: Record<ParsedIntentAction, string[]> = {
  EXPLAIN: ['explain', 'what happened', 'break it down', 'analyze', 'why', 'call', 'review'],
  PAUSE: ['pause', 'stop', 'hold on', 'freeze', 'wait', 'halt'],
  RESUME: ['resume', 'play', 'continue', 'unpause', 'go'],
  REPLAY: ['replay', 'rewind', 'look again', 'show again', 'back up'],
  SHOW_MY_TEAM: ['my team', 'team stats', 'madrid', 'city', 'roster', 'lineup'],
  FITNESS: ['fitness', 'workout', 'exercise', 'squat', 'jump', 'train'],
  TRIVIA: ['trivia', 'quiz', 'game', 'question', 'buzz in'],
  NAVIGATE: ['go to', 'open', 'switch to', 'show'],
  UNKNOWN: [],
};

const KNOWN_PLAYERS = ['Mbappé', 'Vinícius', 'Bellingham', 'Valverde', 'Haaland', 'De Bruyne', 'Rodri'];
const KNOWN_TEAMS = ['Real Madrid', 'Man City'];

// Clean text while preserving unicode characters
function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

// Strip diacritics for robust matching (e.g. mbappé -> mbappe)
function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function parseVoiceIntent(rawText: string): ParsedVoiceIntent {
  const normalized = cleanText(rawText);
  const normalizedPlain = stripDiacritics(normalized);
  const words = normalized.split(/\s+/);
  let matchedAction: ParsedIntentAction = 'UNKNOWN';
  let highestConfidence = 0.5;

  // 1. Direct and fuzzy matching against synonyms
  for (const [action, phrases] of Object.entries(SYNONYMS) as [ParsedIntentAction, string[]][]) {
    for (const phrase of phrases) {
      if (normalized.includes(phrase) || normalizedPlain.includes(phrase)) {
        matchedAction = action;
        highestConfidence = 0.98;
        break;
      }

      // Check single-word fuzzy distance
      for (const word of words) {
        if (word.length >= 4 && phrase.length >= 4) {
          const dist = levenshteinDistance(word, phrase);
          if (dist <= 2) {
            matchedAction = action;
            highestConfidence = 0.88;
            break;
          }
        }
      }
      if (matchedAction !== 'UNKNOWN') break;
    }
    if (matchedAction !== 'UNKNOWN') break;
  }

  // 2. Slot Extraction
  const slots: ExtractedSlots = {
    requiresTarget: normalized.includes('that') || normalized.includes('this') || normalized.includes('him'),
  };

  // Player slot
  for (const p of KNOWN_PLAYERS) {
    const pPlain = stripDiacritics(p.toLowerCase());
    if (normalized.includes(p.toLowerCase()) || normalizedPlain.includes(pPlain)) {
      slots.player = p;
      break;
    }
  }

  // Team slot
  for (const t of KNOWN_TEAMS) {
    if (normalized.includes(t.toLowerCase()) || normalizedPlain.includes(stripDiacritics(t.toLowerCase()))) {
      slots.team = t;
      break;
    }
  }

  // Exercise slot
  if (normalized.includes('squat')) slots.exercise = 'Squats';
  else if (normalized.includes('jump')) slots.exercise = 'Jumping Jacks';
  else if (normalized.includes('knee')) slots.exercise = 'High Knees';

  // Trivia Answer slot (A, B, C, D or 1, 2, 3, 4)
  if (/\b(option a|answer a|first option|number one|1)\b/.test(normalized)) slots.answerOption = 0;
  else if (/\b(option b|answer b|second option|number two|2)\b/.test(normalized)) slots.answerOption = 1;
  else if (/\b(option c|answer c|third option|number three|3)\b/.test(normalized)) slots.answerOption = 2;
  else if (/\b(option d|answer d|fourth option|number four|4)\b/.test(normalized)) slots.answerOption = 3;

  return {
    raw: rawText,
    normalized,
    action: matchedAction,
    confidence: highestConfidence,
    slots,
  };
}
