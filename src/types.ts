import { WorkspaceToolMode } from './utils/aiLogic';

export interface AttachmentItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
  textContent?: string;
}

export interface ToolExecutionTrace {
  toolName: string;
  input: string;
  output: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  ownerId: string;
  role: 'user' | 'assistant';
  content: string;
  modelId: string;
  attachmentName: string;
  attachmentType: string;
  attachmentPreviewUrl?: string;
  ttftMs: number;
  totalDurationMs: number;
  saved: boolean;
  createdAt: string;
  updatedAt: string;
  toolTraces?: ToolExecutionTrace[];
  groundingSources?: GroundingSource[];
  feedbackRating?: 'up' | 'down';
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ConversationItem {
  id: string;
  ownerId: string;
  title: string;
  toolMode: WorkspaceToolMode;
  modelId: string;
  pinned: boolean;
  archived: boolean;
  summary: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserMemoryItem {
  id: string;
  ownerId: string;
  fact: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  language: 'en' | 'ta';
  theme: 'light' | 'dark' | 'system';
  memoryEnabled: boolean;
  plan: 'free' | 'pro';
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedImageRecord {
  id: string;
  prompt: string;
  aspectRatio: string;
  imageUrl: string;
  createdAt: string;
  isBlueprintFallback?: boolean;
}

export interface ServerUsageResponse {
  userId: string;
  plan: 'free' | 'pro';
  usage: {
    dailyRequests: number;
    dailyAttachments: number;
    requestsRemaining: number;
    attachmentsRemaining: number;
  };
  limits: {
    plan: 'free' | 'pro';
    dailyRequestsLimit: number;
    dailyAttachmentsLimit: number;
    maxUploadBytes: number;
    rateLimitPerMinute: number;
  };
  pricing: {
    currencySymbol: string;
    proMonthlyPrice: number;
    proAnnualMonthlyPrice: number;
  };
}

export interface AdminMetricsResponse {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cancelledRequests: number;
  rateLimitEvents: number;
  medianTtftMs: number;
  p95TtftMs: number;
  avgTotalDurationMs: number;
  totalEstimatedTokens: number;
  totalEstimatedCostUsd: number;
  modelUsage: Record<string, number>;
  featureAdoption: Record<string, number>;
  recentEvents: Array<{
    requestId: string;
    timestamp: string;
    model: string;
    toolMode: string;
    ttftMs: number;
    totalDurationMs: number;
    status: string;
    estimatedTokens: number;
    estimatedCostUsd: number;
  }>;
}
