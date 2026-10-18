import test from 'node:test';
import assert from 'node:assert/strict';
import {
  routeModelForTask,
  buildBoundedContext,
  evaluateMathExpression,
  parseCsvDataset,
  checkQuotaAndRateLimit,
  calculateLatencyMetrics,
  validateBlueprintPayload,
  isValidFirestoreId,
} from './aiLogic.ts';

test('Task-based model routing picks low-latency model for short chat and reasoning model for coding', () => {
  const shortRoute = routeModelForTask('auto', 'Hello! Vanakkam!', 'chat', false, 'free');
  assert.equal(shortRoute.resolvedModel, 'gemini-3.1-flash-lite');

  const codingProRoute = routeModelForTask(
    'auto',
    'Design a distributed TypeScript algorithm with concurrent retry queues',
    'coding',
    false,
    'pro'
  );
  assert.equal(codingProRoute.resolvedModel, 'gemini-4-argon');

  const codingFreeRoute = routeModelForTask(
    'auto',
    'Design a distributed TypeScript algorithm with concurrent retry queues',
    'coding',
    false,
    'free'
  );
  assert.equal(codingFreeRoute.resolvedModel, 'gemini-3.8-flash');

  const visionRoute = routeModelForTask('auto', 'What is in this diagram?', 'vision', true, 'free');
  assert.equal(visionRoute.resolvedModel, 'gemini-3.8-flash');
});

test('Bounded context window caps history and preserves earlier summary', () => {
  const messages = Array.from({ length: 20 }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `Turn number ${i + 1} with important content.`,
  }));

  const bounded = buildBoundedContext(messages, '', 8, 10000);
  assert.equal(bounded.includedMessages.length, 8);
  assert.equal(bounded.truncatedCount, 12);
  assert.ok(bounded.summaryHeader && bounded.summaryHeader.includes('12 older messages summarized'));
  assert.equal(bounded.includedMessages[7].content, 'Turn number 20 with important content.');
});

test('Safe deterministic calculator evaluates arithmetic, powers, and functions accurately', () => {
  const r1 = evaluateMathExpression('(12 + 8) * 3 - 4^2');
  assert.equal(r1.ok, true);
  assert.equal(r1.result, 44);

  const r2 = evaluateMathExpression('sqrt(144) + abs(-15)');
  assert.equal(r2.ok, true);
  assert.equal(r2.result, 27);

  const divZero = evaluateMathExpression('100 / (5 - 5)');
  assert.equal(divZero.ok, false);
  assert.match(divZero.error || '', /Division by zero/);
});

test('CSV dataset parser extracts headers, numeric stats, and chart series', () => {
  const sampleCsv = [
    'Region,Revenue,Growth',
    'Chennai,45000,18.5',
    'Coimbatore,32000,14.2',
    'Madurai,28000,12.8',
    'Bengaluru,51000,21.0',
  ].join('\n');

  const parsed = parseCsvDataset(sampleCsv);
  assert.deepEqual(parsed.headers, ['Region', 'Revenue', 'Growth']);
  assert.equal(parsed.rows.length, 4);
  assert.equal(parsed.numericStats.length, 2);
  assert.equal(parsed.numericStats[0].column, 'Revenue');
  assert.equal(parsed.numericStats[0].sum, 156000);
  assert.equal(parsed.numericStats[0].mean, 39000);
  assert.equal(parsed.chartSeries.length, 4);
  assert.equal(parsed.chartSeries[0].label, 'Chennai');
  assert.equal(parsed.chartSeries[0].value, 45000);
});

test('Quota and rate limiter enforces per-minute and daily plan limits', () => {
  const now = 1_700_000_000_000;
  const okUsage = {
    dailyRequests: 10,
    dailyAttachments: 2,
    recentRequestTimestamps: [now - 10_000, now - 5_000],
  };
  assert.equal(checkQuotaAndRateLimit(okUsage, 'free', false, now).allowed, true);

  const quotaExceeded = {
    dailyRequests: 35,
    dailyAttachments: 2,
    recentRequestTimestamps: [],
  };
  const resQuota = checkQuotaAndRateLimit(quotaExceeded, 'free', false, now);
  assert.equal(resQuota.allowed, false);
  assert.equal(resQuota.status, 403);

  const proAllowed = checkQuotaAndRateLimit(quotaExceeded, 'pro', false, now);
  assert.equal(proAllowed.allowed, true);
});

test('Latency percentile calculation returns accurate P50 and P95 TTFT', () => {
  const samples = [
    { ttftMs: 180, totalDurationMs: 900 },
    { ttftMs: 220, totalDurationMs: 1100 },
    { ttftMs: 250, totalDurationMs: 1200 },
    { ttftMs: 310, totalDurationMs: 1500 },
    { ttftMs: 640, totalDurationMs: 2400 },
  ];
  const metrics = calculateLatencyMetrics(samples);
  assert.equal(metrics.medianTtftMs, 250);
  assert.equal(metrics.p95TtftMs, 640);
  assert.equal(metrics.avgTotalDurationMs, 1420);
});

test('Firebase Blueprint validation blocks Dirty Dozen security payloads', () => {
  // 1. Valid UserProfile creation passes
  const validUser = validateBlueprintPayload(
    'UserProfile',
    {
      uid: 'user_abc123',
      displayName: 'Madhavan Tester',
      email: 'tester@example.com',
      language: 'ta',
      theme: 'light',
      memoryEnabled: true,
      plan: 'free',
      createdAt: '2026-10-17T00:00:00Z',
      updatedAt: '2026-10-17T00:00:00Z',
    },
    'user_abc123',
    true
  );
  assert.equal(validUser.valid, true);

  // 2. Shadow field injection (isAdmin: true) fails
  const shadowAttack = validateBlueprintPayload(
    'UserProfile',
    {
      uid: 'user_abc123',
      displayName: 'Attacker',
      email: 'attacker@example.com',
      language: 'en',
      theme: 'light',
      memoryEnabled: true,
      plan: 'free',
      isAdmin: true,
      createdAt: '2026-10-17T00:00:00Z',
      updatedAt: '2026-10-17T00:00:00Z',
    },
    'user_abc123',
    true
  );
  assert.equal(shadowAttack.valid, false);

  // 3. Self-assigned Pro plan on create fails
  const selfProAttack = validateBlueprintPayload(
    'UserProfile',
    {
      uid: 'user_abc123',
      displayName: 'Attacker',
      email: 'attacker@example.com',
      language: 'en',
      theme: 'light',
      memoryEnabled: true,
      plan: 'pro',
      createdAt: '2026-10-17T00:00:00Z',
      updatedAt: '2026-10-17T00:00:00Z',
    },
    'user_abc123',
    true
  );
  assert.equal(selfProAttack.valid, false);

  // 4. Identity spoofing on Conversation ownerId fails
  const spoofConv = validateBlueprintPayload(
    'Conversation',
    {
      id: 'conv_1',
      ownerId: 'victim_uid',
      title: 'Spoofed Chat',
      toolMode: 'chat',
      modelId: 'gemini-3.8-flash',
      pinned: false,
      archived: false,
      summary: '',
      messageCount: 1,
      createdAt: '2026-10-17T00:00:00Z',
      updatedAt: '2026-10-17T00:00:00Z',
    },
    'attacker_uid',
    true
  );
  assert.equal(spoofConv.valid, false);

  // 5. ID poisoning with special characters fails
  assert.equal(isValidFirestoreId('bad$id/injection'), false);
  assert.equal(isValidFirestoreId('valid-id_123'), true);
});
