import React, { useState } from 'react';
import {
  Activity,
  Check,
  CreditCard,
  Download,
  Plus,
  Shield,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import {
  AdminMetricsResponse,
  ChatMessage,
  ConversationItem,
  ServerUsageResponse,
  UserMemoryItem,
} from '../types';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  memoryEnabled: boolean;
  onToggleMemoryEnabled: (enabled: boolean) => void;
  memories: UserMemoryItem[];
  onAddMemory: (fact: string, category: string) => void;
  onDeleteMemory: (id: string) => void;
  conversations: ConversationItem[];
  savedMessages: ChatMessage[];
  onExportAllConversations: () => void;
  onClearAllHistory: () => void;
}

export const MemoryPrivacyModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  isDark,
  memoryEnabled,
  onToggleMemoryEnabled,
  memories,
  onAddMemory,
  onDeleteMemory,
  savedMessages,
  onExportAllConversations,
  onClearAllHistory,
}) => {
  const [newFact, setNewFact] = useState('');
  const [newCategory, setNewCategory] = useState('preference');
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    onAddMemory(newFact.trim(), newCategory);
    setNewFact('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border p-6 shadow-xl max-h-[88vh] overflow-y-auto ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#E5E7EB] text-[#171717]'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#2563EB]" />
            <h2 id="memory-modal-title" className="text-lg font-bold">
              Memory, Saved Answers & Data Privacy
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Memory and Privacy modal"
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6 mt-5">
          {/* Memory Toggle */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#FAFAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800">
            <div>
              <div className="text-sm font-semibold">Personal Memory Context</div>
              <p className="text-xs text-[#737373] dark:text-slate-400 mt-0.5">
                Transparent, editable facts included in your conversation context when enabled.
                MADHAVAN AI never claims to remember facts outside this list.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={memoryEnabled}
              onClick={() => onToggleMemoryEnabled(!memoryEnabled)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                memoryEnabled
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-neutral-200 dark:bg-slate-800 text-[#737373]'
              }`}
            >
              {memoryEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Add Memory Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              aria-label="New personal memory fact"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="Add a fact (e.g. Prefer TypeScript and bilingual Tamil summaries)..."
              className={`flex-1 px-3.5 py-2 text-xs rounded-lg border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-white border-[#E5E7EB] text-[#171717]'
              }`}
            />
            <select
              aria-label="Memory category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className={`px-3 py-2 text-xs rounded-lg border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-100'
                  : 'bg-white border-[#E5E7EB] text-[#171717]'
              }`}
            >
              <option value="preference">Preference</option>
              <option value="project">Project</option>
              <option value="language">Language</option>
              <option value="role">Role / Domain</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memory</span>
            </button>
          </form>

          {/* Stored Memories List */}
          <div>
            <h3 className="text-xs font-semibold text-[#737373] mb-2">
              Stored Memory Facts ({memories.length})
            </h3>
            {memories.length === 0 ? (
              <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-slate-800 text-xs text-[#737373] text-center">
                No personal memory facts stored yet. Add one above so MADHAVAN AI tailors responses to your workflow.
              </div>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-slate-800 bg-[#FAFAFC] dark:bg-slate-950 text-xs"
                  >
                    <div>
                      <span className="font-medium text-[#2563EB] capitalize">{mem.category}</span>
                      <span aria-hidden="true" className="mx-1.5 text-[#737373]">
                        ·
                      </span>
                      <span>{mem.fact}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteMemory(mem.id)}
                      aria-label={`Delete memory ${mem.fact}`}
                      className="text-[#737373] hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Answers */}
          <div>
            <h3 className="text-xs font-semibold text-[#737373] mb-2">
              Bookmarked Answers ({savedMessages.length})
            </h3>
            {savedMessages.length === 0 ? (
              <div className="text-xs text-[#737373]">
                Click the bookmark icon on any assistant response to save it here for quick reference.
              </div>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {savedMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg border border-[#E5E7EB] dark:border-slate-800 text-xs line-clamp-2"
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export & Delete History Controls */}
          <div className="pt-4 border-t border-[#E5E7EB] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExportAllConversations}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E7EB] dark:border-slate-700 text-xs font-medium hover:bg-[#FAFAFC] dark:hover:bg-slate-800 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Export Conversations (JSON)</span>
            </button>

            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Conversation History</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Confirm irreversible deletion?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllHistory();
                    setConfirmClear(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Yes, Delete All
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  usageData: ServerUsageResponse | null;
  onSwitchPlan: (newPlan: 'free' | 'pro') => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  isDark,
  usageData,
  onSwitchPlan,
}) => {
  if (!isOpen) return null;

  const currentPlan = usageData?.plan || 'free';
  const dailyReqs = usageData?.usage.dailyRequests || 0;
  const maxReqs = usageData?.limits.dailyRequestsLimit || 35;
  const dailyAtts = usageData?.usage.dailyAttachments || 0;
  const maxAtts = usageData?.limits.dailyAttachmentsLimit || 10;
  const currency = usageData?.pricing.currencySymbol || '₹';
  const proPrice = usageData?.pricing.proMonthlyPrice ?? 999;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        className={`w-full max-w-3xl rounded-2xl border p-6 shadow-xl max-h-[90vh] overflow-y-auto ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#E5E7EB] text-[#171717]'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-[#2563EB]" />
            <h2 id="subscription-modal-title" className="text-lg font-bold">
              Subscription Plans & Server-Enforced Quotas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Plans and Quotas modal"
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Usage Meter */}
        <div className="mt-5 p-4 rounded-xl bg-[#FAFAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
          <div>
            <div className="text-xs text-[#737373]">Active Entitlement Tier</div>
            <div className="text-base font-bold uppercase text-[#2563EB] mt-0.5">
              {currentPlan} PLAN
            </div>
          </div>
          <div>
            <div className="text-xs text-[#737373]">Daily AI Requests Used</div>
            <div className="text-base font-bold font-mono mt-0.5">
              {dailyReqs} / {maxReqs}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#737373]">Daily Multimodal Attachments</div>
            <div className="text-base font-bold font-mono mt-0.5">
              {dailyAtts} / {maxAtts}
            </div>
          </div>
        </div>

        {/* Plan Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Free Tier */}
          <div
            className={`p-5 rounded-xl border flex flex-col justify-between ${
              currentPlan === 'free'
                ? 'border-[#2563EB] bg-[#EFF6FF]/40 dark:bg-slate-950'
                : 'border-[#E5E7EB] dark:border-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-[#737373]">For individual exploration</div>
              <h3 className="text-lg font-bold mt-1">MADHAVAN Free</h3>
              <div className="text-2xl font-bold font-mono tabular-nums mt-2">
                {currency}0 <span className="text-xs font-normal text-[#737373]">/ month</span>
              </div>
              <ul className="space-y-2 mt-4 text-xs">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#16A34A]" />
                  <span>35 daily AI requests (12 req/min rate limit)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#16A34A]" />
                  <span>Gemini 3.8 Flash & Gemini 3.1 Flash Lite access</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#16A34A]" />
                  <span>10 daily image/document attachments (up to 4 MB)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#16A34A]" />
                  <span>English & தமிழ் bilingual workspace tools</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onSwitchPlan('free')}
              disabled={currentPlan === 'free'}
              className="mt-6 w-full py-2 rounded-lg text-xs font-semibold border border-[#E5E7EB] dark:border-slate-700 disabled:opacity-50 cursor-pointer"
            >
              {currentPlan === 'free' ? 'Current Active Plan' : 'Switch to Free Tier'}
            </button>
          </div>

          {/* Pro Tier */}
          <div
            className={`p-5 rounded-xl border flex flex-col justify-between ${
              currentPlan === 'pro'
                ? 'border-[#2563EB] bg-[#EFF6FF]/40 dark:bg-slate-950'
                : 'border-[#E5E7EB] dark:border-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-[#2563EB]">
                For power users & engineering teams
              </div>
              <h3 className="text-lg font-bold mt-1">MADHAVAN Pro</h3>
              <div className="text-2xl font-bold font-mono tabular-nums mt-2">
                {currency}
                {proPrice}{' '}
                <span className="text-xs font-normal text-[#737373]">
                  / month (Configurable Reference)
                </span>
              </div>
              <ul className="space-y-2 mt-4 text-xs">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2563EB]" />
                  <span>500 daily AI requests (45 req/min high-throughput limit)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2563EB]" />
                  <span>Unlocks Gemini 4 Argon deep reasoning routing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2563EB]" />
                  <span>150 daily multimodal attachments (up to 15 MB)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2563EB]" />
                  <span>Priority Coding, Research, Data & Voice studios</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onSwitchPlan('pro')}
              disabled={currentPlan === 'pro'}
              className="mt-6 w-full py-2 rounded-lg text-xs font-semibold bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {currentPlan === 'pro'
                ? 'Current Active Plan (Pro Enabled)'
                : 'Activate Pro Entitlement (Sandbox)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  metrics: AdminMetricsResponse | null;
  onRefreshMetrics: () => void;
}

export const AdminObservabilityModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isDark,
  metrics,
  onRefreshMetrics,
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'deployment'>('telemetry');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        className={`w-full max-w-4xl rounded-2xl border p-6 shadow-xl max-h-[90vh] overflow-y-auto ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-[#E5E7EB] text-[#171717]'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-[#2563EB]" />
            <h2 id="admin-modal-title" className="text-lg font-bold">
              Observability, Cost Telemetry & Android/Web Release Console
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshMetrics}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-slate-700 text-xs font-medium hover:bg-[#FAFAFC] dark:hover:bg-slate-800 cursor-pointer"
            >
              Refresh Telemetry
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Observability and Admin modal"
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeTab === 'telemetry'
                ? 'bg-[#2563EB] text-white'
                : 'bg-[#FAFAFC] dark:bg-slate-800 text-[#737373]'
            }`}
          >
            Live Latency & Cost Metrics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deployment')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeTab === 'deployment'
                ? 'bg-[#2563EB] text-white'
                : 'bg-[#FAFAFC] dark:bg-slate-800 text-[#737373]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Cloud Run & Android Packaging Guide</span>
          </button>
        </div>

        {activeTab === 'telemetry' ? (
          <div className="space-y-5 mt-5">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-[#FAFAFC] dark:bg-slate-950">
                <div className="text-xs text-[#737373]">Total Requests</div>
                <div className="text-xl font-bold font-mono mt-1">
                  {metrics?.totalRequests ?? 0}
                </div>
                <div className="text-[11px] text-[#16A34A] mt-0.5">
                  {metrics?.successfulRequests ?? 0} succeeded · {metrics?.failedRequests ?? 0} failed
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-[#FAFAFC] dark:bg-slate-950">
                <div className="text-xs text-[#737373]">Median TTFT (P50)</div>
                <div className="text-xl font-bold font-mono mt-1">
                  {metrics?.medianTtftMs ?? 0} ms
                </div>
                <div className="text-[11px] text-[#737373] mt-0.5">
                  P95 TTFT: {metrics?.p95TtftMs ?? 0} ms
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-[#FAFAFC] dark:bg-slate-950">
                <div className="text-xs text-[#737373]">Avg Response Time</div>
                <div className="text-xl font-bold font-mono mt-1">
                  {metrics?.avgTotalDurationMs ?? 0} ms
                </div>
                <div className="text-[11px] text-[#737373] mt-0.5">
                  Rate limits: {metrics?.rateLimitEvents ?? 0}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-[#FAFAFC] dark:bg-slate-950">
                <div className="text-xs text-[#737373]">Est. Model Cost</div>
                <div className="text-xl font-bold font-mono mt-1">
                  ${metrics?.totalEstimatedCostUsd?.toFixed(4) ?? '0.0000'}
                </div>
                <div className="text-[11px] text-[#737373] mt-0.5">
                  {metrics?.totalEstimatedTokens?.toLocaleString() ?? 0} est. tokens
                </div>
              </div>
            </div>

            {/* Model Usage & Feature Adoption */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-slate-800">
                <h3 className="text-xs font-semibold text-[#737373] mb-3">
                  Model Routing Distribution
                </h3>
                <div className="space-y-2 text-xs tabular-nums">
                  {Object.entries(metrics?.modelUsage || {}).map(([mod, count]) => (
                    <div key={mod} className="flex items-center justify-between">
                      <span className="font-mono">{mod}</span>
                      <span className="font-semibold font-mono">{count} requests</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-slate-800">
                <h3 className="text-xs font-semibold text-[#737373] mb-3">
                  Workspace Tool Adoption
                </h3>
                <div className="space-y-2 text-xs tabular-nums">
                  {Object.entries(metrics?.featureAdoption || {}).map(([feat, count]) => (
                    <div key={feat} className="flex items-center justify-between">
                      <span className="capitalize">{feat}</span>
                      <span className="font-semibold font-mono">{count} sessions</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Request Telemetry Table (Privacy-preserving: no message content stored) */}
            <div className="rounded-xl border border-[#E5E7EB] dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="bg-[#FAFAFC] dark:bg-slate-950 border-b border-[#E5E7EB] dark:border-slate-800 text-[#737373]">
                  <tr>
                    <th className="px-3.5 py-2.5">Request ID</th>
                    <th className="px-3.5 py-2.5">Model</th>
                    <th className="px-3.5 py-2.5">Tool</th>
                    <th className="px-3.5 py-2.5 text-right">TTFT</th>
                    <th className="px-3.5 py-2.5 text-right">Total</th>
                    <th className="px-3.5 py-2.5 text-right">Tokens</th>
                    <th className="px-3.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(metrics?.recentEvents || []).map((evt) => (
                    <tr
                      key={evt.requestId}
                      className="border-t border-[#E5E7EB] dark:border-slate-800"
                    >
                      <td className="px-3.5 py-2 font-mono text-[11px]">{evt.requestId}</td>
                      <td className="px-3.5 py-2 font-mono">{evt.model}</td>
                      <td className="px-3.5 py-2 capitalize">{evt.toolMode}</td>
                      <td className="px-3.5 py-2 text-right font-mono">{evt.ttftMs} ms</td>
                      <td className="px-3.5 py-2 text-right font-mono">{evt.totalDurationMs} ms</td>
                      <td className="px-3.5 py-2 text-right font-mono">{evt.estimatedTokens}</td>
                      <td className="px-3.5 py-2 font-medium capitalize">
                        <span
                          className={
                            evt.status === 'success'
                              ? 'text-[#16A34A]'
                              : evt.status === 'cancelled'
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }
                        >
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-5 text-xs leading-relaxed">
            <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-[#FAFAFC] dark:bg-slate-950 space-y-2">
              <h3 className="text-sm font-bold text-[#171717] dark:text-white">
                1. Web & Cloud Run Production Deployment
              </h3>
              <p className="text-[#737373] dark:text-slate-300">
                MADHAVAN AI runs as a unified Node.js + Express + Vite full-stack server on Port 3000.
                All Gemini SDK calls execute strictly server-side using <code>process.env.GEMINI_API_KEY</code>.
                Firestore Security Rules are deployed and enforced on database{' '}
                <code>ai-studio-801eddca-fd7f-43d0-8e1f-4faa8d6cc8f0</code>.
              </p>
              <pre className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 font-mono text-[11px] overflow-x-auto">
{`# Build frontend bundle & run production server
npm run build
NODE_ENV=production npm start`}
              </pre>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-[#FAFAFC] dark:bg-slate-950 space-y-2">
              <h3 className="text-sm font-bold text-[#171717] dark:text-white">
                2. Android Packaging Workflow (Capacitor / Trusted Web Activity)
              </h3>
              <p className="text-[#737373] dark:text-slate-300">
                To produce a signed Android App Bundle (<code>.aab</code>) for Google Play distribution:
              </p>
              <pre className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 font-mono text-[11px] overflow-x-auto">
{`# App Identity: ai.madhavan.assistant
# 1. Initialize Capacitor Android wrapper pointing to your Cloud Run URL or dist/
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "MADHAVAN AI" "ai.madhavan.assistant" --web-dir=dist
npm run build
npx cap add android
npx cap sync android

# 2. Generate signed release Android App Bundle (.aab)
cd android && ./gradlew bundleRelease`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
