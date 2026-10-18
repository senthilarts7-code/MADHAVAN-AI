/**
 * Pure decoupled business logic for MADHAVAN AI:
 * - Model catalog & task-based routing
 * - Bounded conversation context construction
 * - Safe deterministic math calculator tool
 * - CSV / spreadsheet parser & statistical aggregation
 * - Quota, rate-limiting & observability percentile calculations
 * - Firebase Blueprint payload validation (Eight Pillars of Hardened Rules)
 */

export interface ModelConfig {
  id: string;
  name: string;
  tagline: string;
  tier: 'free' | 'pro';
  supportsVision: boolean;
  supportsDocuments: boolean;
  supportsSearch: boolean;
  costPer1kInputUsd: number;
  costPer1kOutputUsd: number;
}

export const MODEL_CATALOG: Record<string, ModelConfig> = {
  'auto': {
    id: 'auto',
    name: 'Madhavan Auto Router',
    tagline: 'Intelligent task-based routing across fast & reasoning models',
    tier: 'free',
    supportsVision: true,
    supportsDocuments: true,
    supportsSearch: true,
    costPer1kInputUsd: 0.00015,
    costPer1kOutputUsd: 0.0006,
  },
  'gemini-3.8-flash': {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tagline: 'Balanced low-latency multimodal & multilingual assistant',
    tier: 'free',
    supportsVision: true,
    supportsDocuments: true,
    supportsSearch: true,
    costPer1kInputUsd: 0.00015,
    costPer1kOutputUsd: 0.0006,
  },
  'gemini-3.1-flash-lite': {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    tagline: 'Ultra-fast responses for everyday chat & instant translation',
    tier: 'free',
    supportsVision: true,
    supportsDocuments: true,
    supportsSearch: false,
    costPer1kInputUsd: 0.000075,
    costPer1kOutputUsd: 0.0003,
  },
  'gemini-4-argon': {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Pro)',
    tagline: 'Deep reasoning for complex coding, STEM, and system architecture',
    tier: 'pro',
    supportsVision: true,
    supportsDocuments: true,
    supportsSearch: true,
    costPer1kInputUsd: 0.00125,
    costPer1kOutputUsd: 0.005,
  },
};

export type WorkspaceToolMode =
  | 'chat'
  | 'coding'
  | 'vision'
  | 'document'
  | 'image_gen'
  | 'voice'
  | 'research'
  | 'study'
  | 'writing'
  | 'data';

export interface RouteDecision {
  resolvedModel: string;
  reason: string;
}

/**
 * Task-based model router.
 * Selects the optimal supported Gemini model based on user selection, tool mode,
 * attachments, and prompt complexity without calling multiple models redundantly.
 */
export function routeModelForTask(
  requestedModel: string,
  prompt: string,
  toolMode: WorkspaceToolMode,
  hasAttachments: boolean,
  userPlan: 'free' | 'pro' = 'free'
): RouteDecision {
  // If user selected a specific valid non-auto model
  if (requestedModel && requestedModel !== 'auto' && MODEL_CATALOG[requestedModel]) {
    if (requestedModel === 'gemini-4-argon' && userPlan !== 'pro') {
      return {
        resolvedModel: 'gemini-3.8-flash',
        reason: 'Fallback to Gemini 3.8 Flash (Pro plan required for Gemini 4 Argon)',
      };
    }
    return {
      resolvedModel: requestedModel,
      reason: `User explicitly selected ${MODEL_CATALOG[requestedModel].name}`,
    };
  }

  // Multimodal attachments (images/documents)
  if (hasAttachments || toolMode === 'vision' || toolMode === 'document') {
    return {
      resolvedModel: 'gemini-3.8-flash',
      reason: 'Multimodal attachment or document intelligence task routed to Gemini 3.8 Flash',
    };
  }

  // Complex coding, math, or architecture
  const lower = prompt.toLowerCase();
  const isComplexReasoning =
    toolMode === 'coding' ||
    toolMode === 'study' ||
    prompt.length > 600 ||
    /\b(algorithm|architecture|refactor|debug|theorem|calculus|proof|optimize|concurrent|distributed|typescript|python|rust)\b/i.test(lower);

  if (isComplexReasoning) {
    if (userPlan === 'pro') {
      return {
        resolvedModel: 'gemini-4-argon',
        reason: 'Complex reasoning / coding task routed to Gemini 4 Argon',
      };
    }
    return {
      resolvedModel: 'gemini-3.8-flash',
      reason: 'Reasoning & coding task routed to Gemini 3.8 Flash',
    };
  }

  // Web research requires search grounding support
  if (toolMode === 'research' || toolMode === 'data') {
    return {
      resolvedModel: 'gemini-3.8-flash',
      reason: 'Research & analytical task routed to Gemini 3.8 Flash',
    };
  }

  // Short, simple conversational query -> low-latency model
  if (prompt.trim().length < 100 && toolMode === 'chat') {
    return {
      resolvedModel: 'gemini-3.1-flash-lite',
      reason: 'Short conversational query routed to low-latency Gemini 3.1 Flash Lite',
    };
  }

  return {
    resolvedModel: 'gemini-3.8-flash',
    reason: 'General task routed to Gemini 3.8 Flash',
  };
}

export interface ContextMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface BoundedContextResult {
  includedMessages: ContextMessageInput[];
  summaryHeader: string | null;
  truncatedCount: number;
  totalChars: number;
}

/**
 * Constructs a bounded context window so long conversations do not exceed
 * latency or token budgets while preserving recent turns and a summary of earlier context.
 */
export function buildBoundedContext(
  messages: ContextMessageInput[],
  existingSummary: string = '',
  maxMessages: number = 12,
  maxChars: number = 24000
): BoundedContextResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      includedMessages: [],
      summaryHeader: existingSummary ? `Previous conversation summary: ${existingSummary}` : null,
      truncatedCount: 0,
      totalChars: 0,
    };
  }

  const recentSlice = messages.slice(-maxMessages);
  const olderMessages = messages.slice(0, Math.max(0, messages.length - maxMessages));

  const included: ContextMessageInput[] = [];
  let charCount = 0;

  // Walk backwards from most recent message to respect maxChars budget
  for (let i = recentSlice.length - 1; i >= 0; i--) {
    const msg = recentSlice[i];
    const safeContent = (msg.content || '').slice(0, 12000);
    if (charCount + safeContent.length > maxChars && included.length > 0) {
      olderMessages.push(msg);
      continue;
    }
    included.unshift({ role: msg.role, content: safeContent });
    charCount += safeContent.length;
  }

  let summaryHeader: string | null = null;
  if (existingSummary.trim()) {
    summaryHeader = `Conversation Context Summary: ${existingSummary.trim().slice(0, 1500)}`;
  } else if (olderMessages.length > 0) {
    const snippets = olderMessages
      .slice(-4)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 120).replace(/\s+/g, ' ')}`)
      .join(' | ');
    summaryHeader = `Earlier turns (${olderMessages.length} older messages summarized): ${snippets}`;
  }

  return {
    includedMessages: included,
    summaryHeader,
    truncatedCount: messages.length - included.length,
    totalChars: charCount,
  };
}

/**
 * Safe deterministic recursive-descent mathematical evaluator.
 * Supports +, -, *, /, ^, parentheses, and common math functions (sqrt, abs, round, sin, cos, tan, log, ln)
 * without using unsafe eval() or Function().
 */
export function evaluateMathExpression(expression: string): { ok: boolean; result?: number; error?: string } {
  const cleaned = (expression || '').trim();
  if (!cleaned || cleaned.length > 200) {
    return { ok: false, error: 'Expression must be between 1 and 200 characters.' };
  }

  let pos = 0;
  const str = cleaned.replace(/\s+/g, '');

  function peek(): string {
    return str[pos] || '';
  }

  function consume(): string {
    return str[pos++] || '';
  }

  function parseExpression(): number {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parsePower();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const right = parsePower();
      if ((op === '/' || op === '%') && right === 0) {
        throw new Error('Division by zero');
      }
      if (op === '*') val *= right;
      else if (op === '/') val /= right;
      else val %= right;
    }
    return val;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek() === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '+') {
      consume();
      return parseUnary();
    }
    if (peek() === '-') {
      consume();
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (peek() === '(') {
      consume();
      const val = parseExpression();
      if (consume() !== ')') {
        throw new Error('Mismatched parentheses');
      }
      return val;
    }

    // Check identifiers (functions or constants)
    if (/[a-zA-Z]/.test(peek())) {
      let ident = '';
      while (/[a-zA-Z]/.test(peek())) {
        ident += consume();
      }
      const lower = ident.toLowerCase();
      if (lower === 'pi') return Math.PI;
      if (lower === 'e') return Math.E;

      if (consume() !== '(') {
        throw new Error(`Unknown identifier: ${ident}`);
      }
      const arg = parseExpression();
      if (consume() !== ')') {
        throw new Error(`Missing closing parenthesis for ${ident}`);
      }
      switch (lower) {
        case 'sqrt':
          if (arg < 0) throw new Error('Square root of negative number');
          return Math.sqrt(arg);
        case 'abs':
          return Math.abs(arg);
        case 'round':
          return Math.round(arg);
        case 'sin':
          return Math.sin(arg);
        case 'cos':
          return Math.cos(arg);
        case 'tan':
          return Math.tan(arg);
        case 'log':
          return Math.log10(arg);
        case 'ln':
          return Math.log(arg);
        default:
          throw new Error(`Unsupported function: ${ident}`);
      }
    }

    // Parse number
    let numStr = '';
    while (/[0-9.]/.test(peek())) {
      numStr += consume();
    }
    if (!numStr) {
      throw new Error(`Unexpected token at position ${pos}`);
    }
    const parsed = Number(numStr);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid number: ${numStr}`);
    }
    return parsed;
  }

  try {
    const value = parseExpression();
    if (pos < str.length) {
      return { ok: false, error: `Unexpected character '${str[pos]}' at position ${pos}` };
    }
    if (!Number.isFinite(value)) {
      return { ok: false, error: 'Result is not a finite number' };
    }
    return { ok: true, result: Number(value.toPrecision(12)) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid expression' };
  }
}

export interface ColumnStatistic {
  column: string;
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
}

export interface ParsedDataset {
  headers: string[];
  rows: string[][];
  numericStats: ColumnStatistic[];
  chartSeries: { label: string; value: number }[];
}

/**
 * Parses CSV or TSV tabular data and calculates deterministic statistics
 * and chart series for the Data & Spreadsheet Assistant.
 */
export function parseCsvDataset(rawText: string): ParsedDataset {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], numericStats: [], chartSeries: [] };
  }

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const parseLine = (line: string): string[] =>
    line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1, 201).map(parseLine);

  const numericStats: ColumnStatistic[] = [];
  headers.forEach((colName, colIdx) => {
    const nums: number[] = [];
    for (const row of rows) {
      const rawVal = row[colIdx];
      if (rawVal !== undefined && rawVal !== '') {
        const cleaned = rawVal.replace(/[$,%]/g, '');
        const n = Number(cleaned);
        if (!Number.isNaN(n) && Number.isFinite(n)) {
          nums.push(n);
        }
      }
    }
    if (nums.length > 0 && nums.length >= Math.ceil(rows.length * 0.5)) {
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      numericStats.push({
        column: colName || `Column ${colIdx + 1}`,
        count: nums.length,
        sum: Number(sum.toFixed(2)),
        mean: Number(mean.toFixed(2)),
        min: Number(min.toFixed(2)),
        max: Number(max.toFixed(2)),
      });
    }
  });

  const chartSeries: { label: string; value: number }[] = [];
  if (rows.length > 0 && headers.length >= 2) {
    // Use first column as label and first numeric column as value
    const firstNumColName = numericStats[0]?.column;
    const valColIdx = firstNumColName ? headers.indexOf(firstNumColName) : 1;
    for (const row of rows.slice(0, 12)) {
      const label = row[0] || 'Item';
      const val = Number((row[valColIdx] || '0').replace(/[$,%]/g, ''));
      if (Number.isFinite(val)) {
        chartSeries.push({ label, value: val });
      }
    }
  }

  return { headers, rows, numericStats, chartSeries };
}

export interface PlanQuotaConfig {
  plan: 'free' | 'pro';
  dailyRequestsLimit: number;
  dailyAttachmentsLimit: number;
  maxUploadBytes: number;
  rateLimitPerMinute: number;
}

export const PLAN_CONFIGS: Record<'free' | 'pro', PlanQuotaConfig> = {
  free: {
    plan: 'free',
    dailyRequestsLimit: 35,
    dailyAttachmentsLimit: 10,
    maxUploadBytes: 4 * 1024 * 1024, // 4 MB
    rateLimitPerMinute: 12,
  },
  pro: {
    plan: 'pro',
    dailyRequestsLimit: 500,
    dailyAttachmentsLimit: 150,
    maxUploadBytes: 15 * 1024 * 1024, // 15 MB
    rateLimitPerMinute: 45,
  },
};

export interface UserUsageRecord {
  dailyRequests: number;
  dailyAttachments: number;
  recentRequestTimestamps: number[];
}

export function checkQuotaAndRateLimit(
  usage: UserUsageRecord,
  plan: 'free' | 'pro',
  hasAttachment: boolean,
  nowMs: number = Date.now()
): { allowed: boolean; status: number; reason?: string } {
  const cfg = PLAN_CONFIGS[plan] || PLAN_CONFIGS.free;

  // Prune timestamps older than 60s
  const windowStart = nowMs - 60_000;
  const recentInWindow = usage.recentRequestTimestamps.filter((t) => t > windowStart);

  if (recentInWindow.length >= cfg.rateLimitPerMinute) {
    return {
      allowed: false,
      status: 429,
      reason: `Rate limit reached (${cfg.rateLimitPerMinute} requests/minute on ${plan.toUpperCase()} plan). Please wait a few seconds.`,
    };
  }

  if (usage.dailyRequests >= cfg.dailyRequestsLimit) {
    return {
      allowed: false,
      status: 403,
      reason: `Daily request quota (${cfg.dailyRequestsLimit}/day) reached for your ${plan.toUpperCase()} plan. Upgrade to Pro for higher limits.`,
    };
  }

  if (hasAttachment && usage.dailyAttachments >= cfg.dailyAttachmentsLimit) {
    return {
      allowed: false,
      status: 403,
      reason: `Daily attachment quota (${cfg.dailyAttachmentsLimit}/day) reached for your ${plan.toUpperCase()} plan.`,
    };
  }

  return { allowed: true, status: 200 };
}

export interface LatencySummary {
  medianTtftMs: number;
  p95TtftMs: number;
  avgTotalDurationMs: number;
}

export function calculateLatencyMetrics(
  samples: { ttftMs: number; totalDurationMs: number }[]
): LatencySummary {
  if (!samples || samples.length === 0) {
    return { medianTtftMs: 0, p95TtftMs: 0, avgTotalDurationMs: 0 };
  }

  const ttfts = samples.map((s) => s.ttftMs).filter((n) => n >= 0).sort((a, b) => a - b);
  const totals = samples.map((s) => s.totalDurationMs).filter((n) => n >= 0);

  const medianIdx = Math.floor(ttfts.length * 0.5);
  const p95Idx = Math.min(ttfts.length - 1, Math.floor(ttfts.length * 0.95));

  const medianTtftMs = ttfts.length > 0 ? Math.round(ttfts[medianIdx]) : 0;
  const p95TtftMs = ttfts.length > 0 ? Math.round(ttfts[p95Idx]) : 0;
  const avgTotalDurationMs =
    totals.length > 0
      ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
      : 0;

  return { medianTtftMs, p95TtftMs, avgTotalDurationMs };
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function isValidFirestoreId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

/**
 * Validates outgoing or incoming Firestore payloads against the strict
 * Firebase Blueprint schema and Eight Pillars of Hardened Rules.
 */
export function validateBlueprintPayload(
  entity: 'UserProfile' | 'Conversation' | 'Message' | 'UserMemory' | 'FeedbackRecord',
  data: Record<string, unknown>,
  authUid: string,
  isCreate: boolean = true
): { valid: boolean; reason?: string } {
  if (!authUid || !isValidFirestoreId(authUid)) {
    return { valid: false, reason: 'Unauthenticated or invalid auth UID' };
  }
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Payload must be an object' };
  }

  const keys = Object.keys(data);
  const hasExactKeys = (expected: string[]) =>
    keys.length === expected.length && expected.every((k) => keys.includes(k));

  if (entity === 'UserProfile') {
    const required = ['uid', 'displayName', 'email', 'language', 'theme', 'memoryEnabled', 'plan', 'createdAt', 'updatedAt'];
    if (!hasExactKeys(required)) return { valid: false, reason: 'Shadow or missing keys on UserProfile' };
    if (!isValidFirestoreId(data.uid) || data.uid !== authUid) return { valid: false, reason: 'Identity mismatch on uid' };
    if (typeof data.displayName !== 'string' || data.displayName.length < 1 || data.displayName.length > 100) {
      return { valid: false, reason: 'Invalid displayName length' };
    }
    if (typeof data.email !== 'string' || data.email.length < 3 || data.email.length > 254) {
      return { valid: false, reason: 'Invalid email' };
    }
    if (data.language !== 'en' && data.language !== 'ta') return { valid: false, reason: 'Invalid language enum' };
    if (data.theme !== 'light' && data.theme !== 'dark' && data.theme !== 'system') return { valid: false, reason: 'Invalid theme enum' };
    if (typeof data.memoryEnabled !== 'boolean') return { valid: false, reason: 'Invalid memoryEnabled' };
    if (isCreate && data.plan !== 'free') return { valid: false, reason: 'Cannot self-assign pro plan on creation' };
    if (data.plan !== 'free' && data.plan !== 'pro') return { valid: false, reason: 'Invalid plan enum' };
    return { valid: true };
  }

  if (entity === 'Conversation') {
    const required = ['id', 'ownerId', 'title', 'toolMode', 'modelId', 'pinned', 'archived', 'summary', 'messageCount', 'createdAt', 'updatedAt'];
    if (!hasExactKeys(required)) return { valid: false, reason: 'Shadow or missing keys on Conversation' };
    if (!isValidFirestoreId(data.id)) return { valid: false, reason: 'Invalid conversation id' };
    if (!isValidFirestoreId(data.ownerId) || data.ownerId !== authUid) return { valid: false, reason: 'Identity spoofing on ownerId' };
    if (typeof data.title !== 'string' || data.title.length < 1 || data.title.length > 200) return { valid: false, reason: 'Invalid title length' };
    if (typeof data.toolMode !== 'string' || data.toolMode.length < 1 || data.toolMode.length > 40) return { valid: false, reason: 'Invalid toolMode' };
    if (typeof data.modelId !== 'string' || data.modelId.length < 1 || data.modelId.length > 60) return { valid: false, reason: 'Invalid modelId' };
    if (typeof data.pinned !== 'boolean' || typeof data.archived !== 'boolean') return { valid: false, reason: 'Invalid flags' };
    if (typeof data.summary !== 'string' || data.summary.length > 2000) return { valid: false, reason: 'Invalid summary length' };
    if (typeof data.messageCount !== 'number' || !Number.isInteger(data.messageCount) || data.messageCount < 0 || data.messageCount > 10000) {
      return { valid: false, reason: 'Invalid messageCount' };
    }
    return { valid: true };
  }

  if (entity === 'Message') {
    const required = ['id', 'conversationId', 'ownerId', 'role', 'content', 'modelId', 'attachmentName', 'attachmentType', 'ttftMs', 'totalDurationMs', 'saved', 'createdAt', 'updatedAt'];
    if (!hasExactKeys(required)) return { valid: false, reason: 'Shadow or missing keys on Message' };
    if (!isValidFirestoreId(data.id) || !isValidFirestoreId(data.conversationId)) return { valid: false, reason: 'Invalid IDs' };
    if (!isValidFirestoreId(data.ownerId) || data.ownerId !== authUid) return { valid: false, reason: 'Identity spoofing on ownerId' };
    if (data.role !== 'user' && data.role !== 'assistant') return { valid: false, reason: 'Invalid role' };
    if (typeof data.content !== 'string' || data.content.length < 1 || data.content.length > 50000) return { valid: false, reason: 'Invalid content size' };
    if (typeof data.modelId !== 'string' || data.modelId.length < 1 || data.modelId.length > 60) return { valid: false, reason: 'Invalid modelId' };
    if (typeof data.attachmentName !== 'string' || data.attachmentName.length > 255) return { valid: false, reason: 'Invalid attachmentName' };
    if (typeof data.attachmentType !== 'string' || data.attachmentType.length > 100) return { valid: false, reason: 'Invalid attachmentType' };
    if (typeof data.ttftMs !== 'number' || data.ttftMs < 0 || typeof data.totalDurationMs !== 'number' || data.totalDurationMs < 0) {
      return { valid: false, reason: 'Invalid latency numbers' };
    }
    if (typeof data.saved !== 'boolean') return { valid: false, reason: 'Invalid saved boolean' };
    return { valid: true };
  }

  if (entity === 'UserMemory') {
    const required = ['id', 'ownerId', 'fact', 'category', 'createdAt', 'updatedAt'];
    if (!hasExactKeys(required)) return { valid: false, reason: 'Shadow or missing keys on UserMemory' };
    if (!isValidFirestoreId(data.id)) return { valid: false, reason: 'Invalid memory id' };
    if (!isValidFirestoreId(data.ownerId) || data.ownerId !== authUid) return { valid: false, reason: 'Identity spoofing on ownerId' };
    if (typeof data.fact !== 'string' || data.fact.length < 1 || data.fact.length > 1000) return { valid: false, reason: 'Invalid fact length' };
    if (typeof data.category !== 'string' || data.category.length < 1 || data.category.length > 50) return { valid: false, reason: 'Invalid category length' };
    return { valid: true };
  }

  if (entity === 'FeedbackRecord') {
    const required = ['id', 'ownerId', 'conversationId', 'rating', 'comment', 'createdAt'];
    if (!hasExactKeys(required)) return { valid: false, reason: 'Shadow or missing keys on FeedbackRecord' };
    if (!isValidFirestoreId(data.id) || !isValidFirestoreId(data.conversationId)) return { valid: false, reason: 'Invalid IDs' };
    if (!isValidFirestoreId(data.ownerId) || data.ownerId !== authUid) return { valid: false, reason: 'Identity spoofing on ownerId' };
    if (data.rating !== 'up' && data.rating !== 'down') return { valid: false, reason: 'Invalid rating' };
    if (typeof data.comment !== 'string' || data.comment.length > 1000) return { valid: false, reason: 'Invalid comment length' };
    return { valid: true };
  }

  return { valid: false, reason: 'Unknown entity' };
}
