import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Bookmark,
  Check,
  Code2,
  Copy,
  CreditCard,
  Edit3,
  FileSpreadsheet,
  FileText,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  Moon,
  Paperclip,
  PenTool,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sliders,
  Sparkles,
  Square,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { WorkspaceToolsPanel } from './components/WorkspaceToolsPanel';
import {
  AdminObservabilityModal,
  MemoryPrivacyModal,
  SubscriptionModal,
} from './components/Modals';
import { UI_STRINGS, WORKSPACE_TOOLS } from './i18n';
import {
  AdminMetricsResponse,
  AttachmentItem,
  ChatMessage,
  ConversationItem,
  GroundingSource,
  ServerUsageResponse,
  ToolExecutionTrace,
  UserMemoryItem,
} from './types';
import { MODEL_CATALOG, WorkspaceToolMode } from './utils/aiLogic';
import {
  auth,
  createUserMemoryInFirestore,
  deleteConversationInFirestore,
  deleteUserMemoryInFirestore,
  ensureUserProfileInFirestore,
  listConversationMessages,
  listUserConversations,
  listUserMemories,
  onAuthStateChanged,
  saveConversationInFirestore,
  saveMessageInFirestore,
  signInWithGooglePopup,
  signOutUser,
  submitFeedbackInFirestore,
  updateUserProfileInFirestore,
  User,
} from './firebase';

const LOCAL_CONVS_KEY = 'madhavan_ai_conversations_v1';
const LOCAL_MSGS_KEY = 'madhavan_ai_messages_v1';
const LOCAL_MEMS_KEY = 'madhavan_ai_memories_v1';

const TOOL_ICONS: Record<WorkspaceToolMode, React.ReactNode> = {
  chat: <MessageSquare className="w-4 h-4" />,
  coding: <Code2 className="w-4 h-4" />,
  vision: <ImageIcon className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  image_gen: <Sparkles className="w-4 h-4" />,
  voice: <Volume2 className="w-4 h-4" />,
  research: <Globe className="w-4 h-4" />,
  study: <GraduationCap className="w-4 h-4" />,
  writing: <PenTool className="w-4 h-4" />,
  data: <FileSpreadsheet className="w-4 h-4" />,
};

export default function App() {
  // Auth & User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Preferences (Default theme MUST be white/light per specification)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'en' | 'ta'>('en');
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(true);
  const isDark = theme === 'dark';

  // Workspace & Model State
  const [activeTool, setActiveTool] = useState<WorkspaceToolMode>('chat');
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [codingLanguage, setCodingLanguage] = useState<string>('TypeScript');
  const [studyDepth, setStudyDepth] = useState<'beginner' | 'intermediate' | 'advanced'>(
    'intermediate'
  );
  const [writingTone, setWritingTone] = useState<string>('Professional');

  // Conversations & Messages State
  const [conversations, setConversations] = useState<ConversationItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_CONVS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_MSGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [memories, setMemories] = useState<UserMemoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_MEMS_KEY);
      if (raw) return JSON.parse(raw);
      return [
        {
          id: 'mem_default_1',
          ownerId: 'guest',
          fact: 'Prefers concise, well-structured answers with practical examples and bilingual Tamil clarity when requested.',
          category: 'preference',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    } catch {
      return [];
    }
  });

  const [activeConvId, setActiveConvId] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_CONVS_KEY);
      const parsed: ConversationItem[] = raw ? JSON.parse(raw) : [];
      return parsed[0]?.id || null;
    } catch {
      return null;
    }
  });

  // Sidebar & Search Filters
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pinned' | 'archived'>('all');
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');

  // Composer & Streaming State
  const [inputPrompt, setInputPrompt] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgContent, setEditingMsgContent] = useState('');

  // Voice Input & Output State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Modals State
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Server Usage & Admin Telemetry
  const [usageData, setUsageData] = useState<ServerUsageResponse | null>(null);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetricsResponse | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const strings = UI_STRINGS[language];
  const currentToolMeta =
    WORKSPACE_TOOLS.find((t) => t.id === activeTool) || WORKSPACE_TOOLS[0];

  // Sync local storage for Guest mode
  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(LOCAL_CONVS_KEY, JSON.stringify(conversations));
        localStorage.setItem(LOCAL_MSGS_KEY, JSON.stringify(messagesByConv));
        localStorage.setItem(LOCAL_MEMS_KEY, JSON.stringify(memories));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [conversations, messagesByConv, memories, currentUser]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await ensureUserProfileInFirestore(user);
          setLanguage(profile.language);
          // Respect default white theme unless user explicitly saved dark
          setTheme(profile.theme === 'dark' ? 'dark' : 'light');
          setMemoryEnabled(profile.memoryEnabled);

          const [remoteConvs, remoteMems] = await Promise.all([
            listUserConversations(user.uid),
            listUserMemories(user.uid),
          ]);
          setConversations(remoteConvs);
          if (remoteMems.length > 0) {
            setMemories(remoteMems);
          }
          if (remoteConvs.length > 0) {
            setActiveConvId(remoteConvs[0].id);
            const msgs = await listConversationMessages(remoteConvs[0].id, user.uid);
            setMessagesByConv((prev) => ({ ...prev, [remoteConvs[0].id]: msgs }));
          }
        } catch (err) {
          console.error('Error syncing user profile:', err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Load Usage & Quota info
  const fetchUsageData = async (uid?: string) => {
    try {
      const queryUid = uid || currentUser?.uid || 'guest';
      const res = await fetch(`/api/usage?userId=${encodeURIComponent(queryUid)}`);
      if (res.ok) {
        const data: ServerUsageResponse = await res.json();
        setUsageData(data);
      }
    } catch {
      // Ignore network hiccup
    }
  };

  const fetchAdminMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data: AdminMetricsResponse = await res.json();
        setAdminMetrics(data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchUsageData(currentUser?.uid);
  }, [currentUser]);

  // Scroll to bottom when messages update
  const activeMessages = useMemo(
    () => (activeConvId ? messagesByConv[activeConvId] || [] : []),
    [activeConvId, messagesByConv]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, isStreaming]);

  // Cleanup active stream on conversation switch or unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSelectConversation = async (conv: ConversationItem) => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setActiveConvId(conv.id);
    setActiveTool(conv.toolMode || 'chat');
    setSidebarOpenMobile(false);
    setStreamError(null);

    if (currentUser && !messagesByConv[conv.id]) {
      try {
        const msgs = await listConversationMessages(conv.id, currentUser.uid);
        setMessagesByConv((prev) => ({ ...prev, [conv.id]: msgs }));
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }
  };

  const handleNewChat = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setActiveConvId(null);
    setInputPrompt('');
    setAttachments([]);
    setStreamError(null);
    setSidebarOpenMobile(false);
  };

  // Filtered conversations for sidebar
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      if (historyFilter === 'pinned' && !c.pinned) return false;
      if (historyFilter === 'archived' && !c.archived) return false;
      if (historyFilter === 'all' && c.archived) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.toolMode.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery, historyFilter]);

  const allSavedMessages = useMemo(() => {
    const all: ChatMessage[] = [];
    (Object.values(messagesByConv) as ChatMessage[][]).forEach((list) => {
      list.forEach((m) => {
        if (m.saved) all.push(m);
      });
    });
    return all;
  }, [messagesByConv]);

  // File Attachment Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxBytes = usageData?.limits.maxUploadBytes || 4 * 1024 * 1024;

    Array.from(files).forEach((file) => {
      if (file.size > maxBytes) {
        setStreamError(
          `File "${file.name}" exceeds your plan's ${(maxBytes / (1024 * 1024)).toFixed(0)} MB upload limit.`
        );
        return;
      }

      const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev.slice(0, 2),
            {
              id,
              name: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
              dataUrl: String(reader.result || ''),
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev.slice(0, 2),
            {
              id,
              name: file.name,
              mimeType: file.type || 'text/plain',
              sizeBytes: file.size,
              textContent: String(reader.result || '').slice(0, 30000),
            },
          ]);
        };
        reader.readAsText(file);
      }
    });
    e.target.value = '';
  };

  // Voice Input (Speech Recognition with explicit user consent)
  const handleToggleVoiceInput = () => {
    if (isListening) {
      const rec = recognitionRef.current as { stop?: () => void } | null;
      rec?.stop?.();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionCtor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setStreamError(
        'Browser speech recognition is unavailable in this environment. You can still type in English or தமிழ் and use Voice Output.'
      );
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognitionCtor as any)();
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Voice Output (Gemini 3.8 Flash Lite TTS with Browser SpeechSynthesis fallback)
  const handleSpeakText = async (textToSpeak: string) => {
    if (isSpeaking) {
      handleStopSpeaking();
      return;
    }

    const clean = textToSpeak.replace(/[#*`>_~]/g, '').slice(0, 900);
    if (!clean.trim()) return;

    setIsSpeaking(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voiceName: 'Kore' }),
      });
      const data = await res.json();
      if (data.ok && data.audioDataUrl) {
        const audio = new Audio(data.audioDataUrl);
        activeAudioRef.current = audio;
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
        return;
      }
    } catch {
      // Fallback to browser speechSynthesis
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  const handleStopSpeaking = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Core Streaming Send Function
  const sendMessage = async (
    overridePrompt?: string,
    overrideHistory?: ChatMessage[],
    extraDocAttachment?: { name: string; content: string }
  ) => {
    const promptToSend = (overridePrompt !== undefined ? overridePrompt : inputPrompt).trim();
    const activeAttachments = [...attachments];
    if (extraDocAttachment) {
      activeAttachments.push({
        id: `att_doc_${Date.now()}`,
        name: extraDocAttachment.name,
        mimeType: 'text/csv',
        sizeBytes: extraDocAttachment.content.length,
        textContent: extraDocAttachment.content,
      });
    }

    if ((!promptToSend && activeAttachments.length === 0) || isStreaming) return;

    setStreamError(null);
    setInputPrompt('');
    setAttachments([]);

    const ownerUid = currentUser?.uid || 'guest';
    const nowIso = new Date().toISOString();

    // Ensure Conversation exists
    let targetConvId = activeConvId;
    let currentConv = conversations.find((c) => c.id === targetConvId);
    const isNewConv = !currentConv;

    if (!currentConv) {
      targetConvId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const titleText =
        (promptToSend || activeAttachments[0]?.name || 'New Conversation')
          .replace(/\s+/g, ' ')
          .slice(0, 60);

      currentConv = {
        id: targetConvId,
        ownerId: ownerUid,
        title: titleText,
        toolMode: activeTool,
        modelId: selectedModel,
        pinned: false,
        archived: false,
        summary: '',
        messageCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setActiveConvId(targetConvId);
      setConversations((prev) => [currentConv!, ...prev]);

      if (currentUser) {
        saveConversationInFirestore(currentConv, true).catch(console.error);
      }
    }

    const baseMessages =
      overrideHistory !== undefined
        ? overrideHistory
        : messagesByConv[targetConvId!] || [];

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: targetConvId!,
      ownerId: ownerUid,
      role: 'user',
      content: promptToSend || `Attached ${activeAttachments.map((a) => a.name).join(', ')}`,
      modelId: selectedModel,
      attachmentName: activeAttachments[0]?.name || '',
      attachmentType: activeAttachments[0]?.mimeType || '',
      attachmentPreviewUrl: activeAttachments[0]?.dataUrl,
      ttftMs: 0,
      totalDurationMs: 0,
      saved: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const assistantMsgId = `msg_a_${Date.now() + 1}_${Math.random().toString(36).slice(2, 6)}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      conversationId: targetConvId!,
      ownerId: ownerUid,
      role: 'assistant',
      content: '',
      modelId: selectedModel === 'auto' ? 'gemini-3.8-flash' : selectedModel,
      attachmentName: '',
      attachmentType: '',
      ttftMs: 0,
      totalDurationMs: 0,
      saved: false,
      createdAt: new Date(Date.now() + 1).toISOString(),
      updatedAt: new Date(Date.now() + 1).toISOString(),
      isStreaming: true,
      toolTraces: [],
      groundingSources: [],
    };

    const updatedTurnList = [...baseMessages, userMsg, assistantPlaceholder];
    setMessagesByConv((prev) => ({
      ...prev,
      [targetConvId!]: updatedTurnList,
    }));

    if (currentUser) {
      saveMessageInFirestore(userMsg, true).catch(console.error);
    }

    // Start SSE stream
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    let streamedText = '';
    let resolvedModelId = assistantPlaceholder.modelId;
    let finalTtftMs = 0;
    let finalTotalDurationMs = 0;
    const collectedTools: ToolExecutionTrace[] = [];
    let collectedSources: GroundingSource[] = [];

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: baseMessages.map((m) => ({ role: m.role, content: m.content })),
          prompt: promptToSend,
          model: selectedModel,
          toolMode: activeTool,
          language,
          userId: ownerUid,
          memories: memoryEnabled ? memories.map((m) => m.fact) : [],
          conversationSummary: currentConv.summary,
          attachments: activeAttachments,
          studyDepth,
          writingTone,
          codingLanguage,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error('Streaming response body unavailable.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvt of events) {
          const lines = rawEvt.split('\n');
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr += line.slice(5).trim();
            }
          }

          if (!dataStr) continue;
          let parsedData: Record<string, unknown> = {};
          try {
            parsedData = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (eventType === 'meta') {
            if (typeof parsedData.resolvedModel === 'string') {
              resolvedModelId = parsedData.resolvedModel;
            }
          } else if (eventType === 'tool') {
            collectedTools.push({
              toolName: String(parsedData.toolName || 'tool'),
              input: String(parsedData.input || ''),
              output: String(parsedData.output || ''),
            });
          } else if (eventType === 'grounding') {
            if (Array.isArray(parsedData.sources)) {
              collectedSources = parsedData.sources as GroundingSource[];
            }
          } else if (eventType === 'token') {
            const tokenText = String(parsedData.text || '');
            streamedText += tokenText;
            if (typeof parsedData.ttftMs === 'number' && parsedData.ttftMs > 0) {
              finalTtftMs = parsedData.ttftMs;
            }

            setMessagesByConv((prev) => {
              const list = prev[targetConvId!] || [];
              return {
                ...prev,
                [targetConvId!]: list.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: streamedText,
                        modelId: resolvedModelId,
                        ttftMs: finalTtftMs,
                        toolTraces: [...collectedTools],
                        groundingSources: [...collectedSources],
                        isStreaming: true,
                      }
                    : m
                ),
              };
            });
          } else if (eventType === 'done') {
            if (typeof parsedData.ttftMs === 'number') finalTtftMs = parsedData.ttftMs;
            if (typeof parsedData.totalDurationMs === 'number') {
              finalTotalDurationMs = parsedData.totalDurationMs;
            }
          } else if (eventType === 'error') {
            throw new Error(String(parsedData.error || 'Stream error'));
          }
        }
      }

      const finalContent = streamedText.trim() || 'Response completed.';
      const finalizedAssistantMsg: ChatMessage = {
        ...assistantPlaceholder,
        content: finalContent,
        modelId: resolvedModelId,
        ttftMs: finalTtftMs,
        totalDurationMs: finalTotalDurationMs,
        toolTraces: collectedTools,
        groundingSources: collectedSources,
        isStreaming: false,
        updatedAt: new Date().toISOString(),
      };

      setMessagesByConv((prev) => {
        const list = prev[targetConvId!] || [];
        return {
          ...prev,
          [targetConvId!]: list.map((m) => (m.id === assistantMsgId ? finalizedAssistantMsg : m)),
        };
      });

      // Update conversation metadata
      const updatedConv: ConversationItem = {
        ...currentConv,
        messageCount: baseMessages.length + 2,
        updatedAt: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) => (c.id === targetConvId ? updatedConv : c))
      );

      if (currentUser) {
        saveMessageInFirestore(finalizedAssistantMsg, true).catch(console.error);
        if (!isNewConv) {
          saveConversationInFirestore(updatedConv, false).catch(console.error);
        }
      }

      fetchUsageData(ownerUid);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        const stoppedContent =
          streamedText.trim() || '_Generation stopped by user._';
        setMessagesByConv((prev) => {
          const list = prev[targetConvId!] || [];
          return {
            ...prev,
            [targetConvId!]: list.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: stoppedContent, isStreaming: false }
                : m
            ),
          };
        });
      } else {
        const errMessage =
          error instanceof Error ? error.message : 'Unable to complete response.';
        setStreamError(errMessage);
        setMessagesByConv((prev) => {
          const list = prev[targetConvId!] || [];
          return {
            ...prev,
            [targetConvId!]: list.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: streamedText
                      ? `${streamedText}\n\n_[Interrupted: ${errMessage}]_`
                      : `Unable to generate response: ${errMessage}`,
                    isStreaming: false,
                    isError: true,
                  }
                : m
            ),
          };
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleRegenerateLast = () => {
    if (isStreaming || activeMessages.length === 0) return;
    // Find last user message
    let lastUserIdx = -1;
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;
    const targetUserMsg = activeMessages[lastUserIdx];
    const priorHistory = activeMessages.slice(0, lastUserIdx);
    sendMessage(targetUserMsg.content, priorHistory);
  };

  const handleSaveEditedMessage = (msgId: string) => {
    if (!editingMsgContent.trim() || isStreaming) return;
    const idx = activeMessages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    const priorHistory = activeMessages.slice(0, idx);
    const updatedText = editingMsgContent.trim();
    setEditingMsgId(null);
    setEditingMsgContent('');
    sendMessage(updatedText, priorHistory);
  };

  const handleTogglePinConv = (conv: ConversationItem) => {
    const updated = { ...conv, pinned: !conv.pinned, updatedAt: new Date().toISOString() };
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? updated : c)));
    if (currentUser) {
      saveConversationInFirestore(updated, false).catch(console.error);
    }
  };

  const handleToggleArchiveConv = (conv: ConversationItem) => {
    const updated = { ...conv, archived: !conv.archived, updatedAt: new Date().toISOString() };
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? updated : c)));
    if (currentUser) {
      saveConversationInFirestore(updated, false).catch(console.error);
    }
  };

  const handleDeleteConversation = (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    setMessagesByConv((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });
    if (activeConvId === convId) {
      setActiveConvId(null);
    }
    if (currentUser) {
      deleteConversationInFirestore(convId).catch(console.error);
    }
  };

  const handleCommitRename = (conv: ConversationItem) => {
    if (!renameTitleInput.trim()) {
      setRenamingConvId(null);
      return;
    }
    const updated = {
      ...conv,
      title: renameTitleInput.trim().slice(0, 200),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? updated : c)));
    setRenamingConvId(null);
    if (currentUser) {
      saveConversationInFirestore(updated, false).catch(console.error);
    }
  };

  const handleToggleSaveMessage = (msg: ChatMessage) => {
    const updated: ChatMessage = {
      ...msg,
      saved: !msg.saved,
      updatedAt: new Date().toISOString(),
    };
    setMessagesByConv((prev) => ({
      ...prev,
      [msg.conversationId]: (prev[msg.conversationId] || []).map((m) =>
        m.id === msg.id ? updated : m
      ),
    }));
    if (currentUser) {
      saveMessageInFirestore(updated, false).catch(console.error);
    }
  };

  const handleFeedback = (msg: ChatMessage, rating: 'up' | 'down') => {
    setMessagesByConv((prev) => ({
      ...prev,
      [msg.conversationId]: (prev[msg.conversationId] || []).map((m) =>
        m.id === msg.id ? { ...m, feedbackRating: rating } : m
      ),
    }));
    if (currentUser) {
      submitFeedbackInFirestore({
        id: `fb_${Date.now()}`,
        ownerId: currentUser.uid,
        conversationId: msg.conversationId,
        rating,
        comment: '',
      }).catch(console.error);
    }
  };

  const handleAddMemory = (fact: string, category: string) => {
    const newMem: UserMemoryItem = {
      id: `mem_${Date.now()}`,
      ownerId: currentUser?.uid || 'guest',
      fact,
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMemories((prev) => [newMem, ...prev]);
    if (currentUser) {
      createUserMemoryInFirestore(newMem).catch(console.error);
    }
  };

  const handleDeleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (currentUser) {
      deleteUserMemoryInFirestore(id).catch(console.error);
    }
  };

  const handleExportAllConversations = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      platform: 'MADHAVAN AI',
      conversations,
      messagesByConv,
      memories,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `madhavan-ai-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAllHistory = () => {
    const toDelete = [...conversations];
    setConversations([]);
    setMessagesByConv({});
    setActiveConvId(null);
    if (currentUser) {
      toDelete.forEach((c) => {
        deleteConversationInFirestore(c.id).catch(console.error);
      });
    }
  };

  const handleSwitchSubscriptionPlan = async (newPlan: 'free' | 'pro') => {
    const uid = currentUser?.uid || 'guest';
    try {
      const res = await fetch('/api/subscription/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, plan: newPlan }),
      });
      if (res.ok) {
        await fetchUsageData(uid);
        if (currentUser) {
          updateUserProfileInFirestore(currentUser.uid, { plan: newPlan }).catch(console.error);
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGooglePopup();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google Sign-In could not be completed.'
      );
    }
  };

  return (
    <div
      className={`min-h-screen h-screen flex overflow-hidden transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#FFFFFF] text-[#171717]'
      }`}
    >
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpenMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpenMobile(false)}
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR — Soft White #FAFAFC in White Mode */}
      <aside
        aria-label="Workspace and Conversation Navigation"
        className={`fixed lg:static inset-y-0 left-0 z-40 w-[276px] shrink-0 flex flex-col border-r transition-transform duration-200 ${
          sidebarOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-[#FAFAFC] border-[#E5E7EB] text-[#171717]'
        }`}
      >
        {/* Brand Header & New Chat Action */}
        <div className="p-4 border-b border-[#E5E7EB] dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <BrandLogo size="md" isDark={isDark} />
            <button
              type="button"
              onClick={() => setSidebarOpenMobile(false)}
              aria-label="Close sidebar"
              className="lg:hidden p-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{strings.newChat}</span>
          </button>
        </div>

        {/* Multimodal Workspace Tools Selector */}
        <div className="px-3 pt-3 pb-2 border-b border-[#E5E7EB] dark:border-slate-800">
          <div className="px-2 mb-1.5 text-[11px] font-semibold text-[#737373]">
            {strings.workspaceTools}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {WORKSPACE_TOOLS.map((tool) => {
              const isSelected = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setActiveTool(tool.id);
                    setSidebarOpenMobile(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left truncate cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                        : 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-[#171717] hover:bg-neutral-200/50'
                  }`}
                >
                  <span className={isSelected ? 'text-[#2563EB]' : 'text-[#737373]'}>
                    {TOOL_ICONS[tool.id]}
                  </span>
                  <span className="truncate">
                    {language === 'ta' ? tool.labelTa : tool.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Conversation History */}
        <div className="p-3 space-y-2 flex-1 flex flex-col min-h-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={strings.searchPlaceholder}
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-[#E5E7EB] text-[#171717] placeholder:text-[#737373]'
              }`}
            />
          </div>

          {/* Filter Tabs: All / Pinned / Archived */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-200/60 dark:bg-slate-950 text-[11px]">
            {(['all', 'pinned', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setHistoryFilter(tab)}
                className={`flex-1 py-1 rounded-md font-medium capitalize transition-colors cursor-pointer ${
                  historyFilter === tab
                    ? isDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-[#171717] shadow-2xs'
                    : 'text-[#737373]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
            {filteredConversations.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-[#737373]">
                {searchQuery
                  ? 'No matching conversations found.'
                  : 'Start a conversation to save history here.'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isCurrent = conv.id === activeConvId;
                const isRenaming = renamingConvId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`group flex items-center justify-between gap-1 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                      isCurrent
                        ? isDark
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                        : isDark
                        ? 'text-slate-300 hover:bg-slate-800/60'
                        : 'text-[#171717] hover:bg-neutral-200/50'
                    }`}
                  >
                    {isRenaming ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleCommitRename(conv);
                        }}
                        className="flex-1 flex items-center gap-1"
                      >
                        <input
                          type="text"
                          aria-label="Rename conversation title"
                          value={renameTitleInput}
                          onChange={(e) => setRenameTitleInput(e.target.value)}
                          autoFocus
                          className="w-full px-1.5 py-0.5 text-xs rounded border border-[#2563EB] bg-white text-[#171717]"
                        />
                        <button
                          type="submit"
                          aria-label="Save conversation title"
                          className="p-1 text-[#16A34A] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectConversation(conv)}
                        className="flex-1 text-left truncate cursor-pointer"
                      >
                        {conv.pinned && <span className="mr-1 text-[#2563EB]">★</span>}
                        {conv.title}
                      </button>
                    )}

                    {!isRenaming && (
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingConvId(conv.id);
                            setRenameTitleInput(conv.title);
                          }}
                          aria-label={`Rename ${conv.title}`}
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePinConv(conv)}
                          aria-label={conv.pinned ? `Unpin ${conv.title}` : `Pin ${conv.title}`}
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleArchiveConv(conv)}
                          aria-label={`Archive ${conv.title}`}
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        >
                          <Archive className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConversation(conv.id)}
                          aria-label={`Delete ${conv.title}`}
                          className="p-1 rounded hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Governance, Subscriptions, Admin & Auth Footer */}
        <div className="p-3 border-t border-[#E5E7EB] dark:border-slate-800 space-y-1.5 text-xs">
          <button
            type="button"
            onClick={() => setIsMemoryModalOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 font-medium">
              <Shield className="w-4 h-4 text-[#2563EB]" />
              <span>{strings.memoryVault}</span>
            </span>
            <span className="text-[11px] text-[#737373] font-mono tabular-nums">
              {memories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchUsageData(currentUser?.uid);
              setIsSubscriptionModalOpen(true);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 font-medium">
              <CreditCard className="w-4 h-4 text-[#2563EB]" />
              <span>{strings.subscriptionPlan}</span>
            </span>
            <span className="text-[11px] font-semibold uppercase text-[#2563EB] font-mono">
              {usageData?.plan || 'FREE'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchAdminMetrics();
              setIsAdminModalOpen(true);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 font-medium">
              <Sliders className="w-4 h-4 text-[#2563EB]" />
              <span>{strings.adminConsole}</span>
            </span>
          </button>

          {/* User Account / Google Auth Status */}
          <div className="pt-2 mt-1 border-t border-[#E5E7EB] dark:border-slate-800">
            {currentUser ? (
              <div className="flex items-center justify-between gap-2 px-1.5 py-1">
                <div className="truncate">
                  <div className="font-semibold truncate">
                    {currentUser.displayName || 'Authenticated User'}
                  </div>
                  <div className="text-[11px] text-[#737373] truncate">{currentUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  aria-label={strings.signOut}
                  className="p-1.5 rounded-lg text-[#737373] hover:text-red-600 hover:bg-neutral-200/50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-[#2563EB] font-semibold text-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{strings.signInGoogle}</span>
              </button>
            )}
            {authError && (
              <p className="text-[11px] text-red-600 mt-1 px-1">{authError}</p>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONVERSATION WORKSPACE — Pure White #FFFFFF Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-[#FFFFFF] dark:bg-slate-950">
        {/* Top Bar Contract: Zone 1 (Context/Mobile Trigger) — Zone 2 (Model & Language Controls) — Zone 3 (Primary Action) */}
        <header
          className={`h-14 shrink-0 px-4 lg:px-6 border-b flex items-center justify-between gap-4 ${
            isDark
              ? 'bg-slate-950 border-slate-800'
              : 'bg-[#FFFFFF] border-[#E5E7EB]'
          }`}
        >
          {/* Zone 1: Mobile Menu Trigger + Active Workspace Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpenMobile(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg border border-[#E5E7EB] dark:border-slate-800 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm font-bold text-[#171717] dark:text-white whitespace-nowrap">
                {language === 'ta' ? currentToolMeta.labelTa : currentToolMeta.labelEn}
              </span>
              <span aria-hidden="true" className="text-[#737373] hidden sm:inline">
                ·
              </span>
              <span className="text-xs text-[#737373] truncate hidden sm:inline">
                {language === 'ta' ? currentToolMeta.descTa : currentToolMeta.descEn}
              </span>
            </div>
          </div>

          {/* Zone 2 & 3: Model Selector, Bilingual Toggle (EN / தமிழ்), Theme Switch */}
          <div className="flex items-center gap-2.5 shrink-0">
            <label htmlFor="model-selector" className="sr-only">
              Select AI Model
            </label>
            <select
              id="model-selector"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-100'
                  : 'bg-[#FAFAFC] border-[#E5E7EB] text-[#171717]'
              }`}
            >
              {Object.values(MODEL_CATALOG).map((mod) => (
                <option key={mod.id} value={mod.id}>
                  {mod.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                const nextLang = language === 'en' ? 'ta' : 'en';
                setLanguage(nextLang);
                if (currentUser) {
                  updateUserProfileInFirestore(currentUser.uid, { language: nextLang }).catch(
                    console.error
                  );
                }
              }}
              aria-label="Switch interface language between English and Tamil"
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                language === 'ta'
                  ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-[#FAFAFC] border-[#E5E7EB] text-[#171717]'
              }`}
            >
              {language === 'en' ? 'EN · தமிழ்' : 'தமிழ் · EN'}
            </button>

            <button
              type="button"
              onClick={() => {
                const nextTheme = theme === 'light' ? 'dark' : 'light';
                setTheme(nextTheme);
                if (currentUser) {
                  updateUserProfileInFirestore(currentUser.uid, { theme: nextTheme }).catch(
                    console.error
                  );
                }
              }}
              aria-label={isDark ? 'Switch to default White theme' : 'Switch to Dark theme'}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-amber-400'
                  : 'bg-[#FAFAFC] border-[#E5E7EB] text-[#737373] hover:text-[#171717]'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Scrollable Chat & Tool Canvas */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto">
            {/* Specialized Multimodal Tool Header Panel */}
            <WorkspaceToolsPanel
              toolMode={activeTool}
              language={language}
              isDark={isDark}
              codingLanguage={codingLanguage}
              onChangeCodingLanguage={setCodingLanguage}
              studyDepth={studyDepth}
              onChangeStudyDepth={setStudyDepth}
              writingTone={writingTone}
              onChangeWritingTone={setWritingTone}
              onSendPrompt={(promptText, extraDoc) =>
                sendMessage(promptText, undefined, extraDoc)
              }
              isSpeaking={isSpeaking}
              onSpeakText={handleSpeakText}
              onStopSpeaking={handleStopSpeaking}
            />

            {/* Empty State / First-Use Onboarding */}
            {activeMessages.length === 0 ? (
              <div className="py-8 sm:py-12 space-y-8">
                <div className="text-center space-y-3 max-w-xl mx-auto">
                  <div className="flex justify-center">
                    <BrandLogo size="lg" isDark={isDark} showWordmark={false} />
                  </div>
                  <h1
                    className="text-2xl sm:text-3xl font-bold tracking-tight text-balance"
                  >
                    {strings.emptyChatTitle}
                  </h1>
                  <p className="text-sm text-[#737373] dark:text-slate-400 leading-relaxed">
                    {strings.emptyChatSubtitle}
                  </p>
                </div>

                {/* Curated Starter Prompts for the Active Tool */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(language === 'ta'
                    ? currentToolMeta.samplePromptsTa
                    : currentToolMeta.samplePromptsEn
                  ).map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(sample)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 hover:border-blue-500 text-slate-200'
                          : 'bg-[#FFFFFF] border-[#E5E7EB] hover:border-[#2563EB] hover:bg-[#FAFAFC] text-[#171717] shadow-2xs'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#2563EB] mb-1">
                        {language === 'ta' ? currentToolMeta.labelTa : currentToolMeta.labelEn}
                      </div>
                      <div className="text-xs leading-relaxed text-[#171717] dark:text-slate-200">
                        {sample}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Active Conversation Message Stream */
              <div className="space-y-6 pb-4">
                {activeMessages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const isEditingThis = editingMsgId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      {/* User Bubble in Subtle Pale Blue (#EFF6FF), Assistant on White (#FFFFFF) */}
                      <div
                        className={`w-full ${
                          isUser
                            ? `max-w-2xl rounded-2xl px-4 py-3 border ${
                                isDark
                                  ? 'bg-blue-950/60 border-blue-900 text-slate-100'
                                  : 'bg-[#EFF6FF] border-[#BFDBFE]/70 text-[#171717]'
                              }`
                            : `rounded-2xl p-4 border ${
                                isDark
                                  ? 'bg-slate-900/50 border-slate-800 text-slate-100'
                                  : 'bg-[#FFFFFF] border-[#E5E7EB] text-[#171717] shadow-2xs'
                              }`
                        }`}
                      >
                        {/* Author Header & Unboxed Metadata */}
                        <div className="flex items-center justify-between gap-2 mb-2 text-xs text-[#737373] dark:text-slate-400 tabular-nums">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#171717] dark:text-slate-200">
                              {isUser ? 'You' : 'MADHAVAN AI'}
                            </span>
                            {!isUser && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-[11px]">{msg.modelId}</span>
                              </>
                            )}
                            {!isUser && msg.ttftMs > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-[11px]">
                                  TTFT {msg.ttftMs}ms
                                </span>
                              </>
                            )}
                          </div>
                          <span className="text-[11px] font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Attached Image / File Indicator */}
                        {msg.attachmentName && (
                          <div className="mb-2.5">
                            {msg.attachmentPreviewUrl ? (
                              <img
                                src={msg.attachmentPreviewUrl}
                                alt={msg.attachmentName}
                                referrerPolicy="no-referrer"
                                className="max-h-48 rounded-lg border border-[#E5E7EB]"
                              />
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-xs">
                                <Paperclip className="w-3 h-3 text-[#2563EB]" />
                                <span>{msg.attachmentName}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message Body or Edit Input */}
                        {isEditingThis ? (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              aria-label="Edit message content"
                              value={editingMsgContent}
                              onChange={(e) => setEditingMsgContent(e.target.value)}
                              className="w-full p-2.5 text-sm rounded-lg border border-[#2563EB] bg-white text-[#171717]"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingMsgId(null)}
                                className="px-3 py-1 rounded-md text-xs border border-[#E5E7EB] bg-white text-[#737373] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedMessage(msg.id)}
                                className="px-3 py-1 rounded-md text-xs font-semibold bg-[#2563EB] text-white cursor-pointer"
                              >
                                Save & Resend
                              </button>
                            </div>
                          </div>
                        ) : isUser ? (
                          <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        ) : msg.isStreaming && !msg.content ? (
                          <div className="flex items-center gap-2 py-2 text-xs text-[#737373]">
                            <span className="inline-block w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
                            <span>MADHAVAN AI is reasoning and streaming response...</span>
                          </div>
                        ) : (
                          <MarkdownRenderer
                            content={msg.content}
                            isDark={isDark}
                            toolTraces={msg.toolTraces}
                            groundingSources={msg.groundingSources}
                          />
                        )}

                        {/* Message Action Bar */}
                        {!msg.isStreaming && (
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-[#E5E7EB]/60 dark:border-slate-800 text-xs text-[#737373]">
                            <div className="flex items-center gap-3">
                              {isUser ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMsgId(msg.id);
                                    setEditingMsgContent(msg.content);
                                  }}
                                  aria-label="Edit and resend message"
                                  className="inline-flex items-center gap-1 hover:text-[#2563EB] transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>{strings.editMessage}</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(msg.content);
                                      setCopiedMsgId(msg.id);
                                      setTimeout(() => setCopiedMsgId(null), 1800);
                                    }}
                                    aria-label={strings.copyText}
                                    className="inline-flex items-center gap-1 hover:text-[#2563EB] transition-colors cursor-pointer"
                                  >
                                    {copiedMsgId === msg.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                                        <span className="text-[#16A34A]">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSpeakText(msg.content)}
                                    aria-label="Read response aloud"
                                    className="inline-flex items-center gap-1 hover:text-[#2563EB] transition-colors cursor-pointer"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                    <span>Listen</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleSaveMessage(msg)}
                                    aria-label={msg.saved ? 'Remove bookmark' : strings.saveAnswer}
                                    className={`inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                      msg.saved ? 'text-[#2563EB] font-semibold' : 'hover:text-[#2563EB]'
                                    }`}
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                    <span>{msg.saved ? 'Saved' : 'Save'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={handleRegenerateLast}
                                    aria-label={strings.regenerate}
                                    className="inline-flex items-center gap-1 hover:text-[#2563EB] transition-colors cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>{strings.regenerate}</span>
                                  </button>
                                </>
                              )}
                            </div>

                            {!isUser && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleFeedback(msg, 'up')}
                                  aria-label="Rate response helpful"
                                  className={`p-1 rounded hover:bg-[#EFF6FF] cursor-pointer ${
                                    msg.feedbackRating === 'up' ? 'text-[#2563EB]' : ''
                                  }`}
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFeedback(msg, 'down')}
                                  aria-label="Rate response unhelpful"
                                  className={`p-1 rounded hover:bg-[#EFF6FF] cursor-pointer ${
                                    msg.feedbackRating === 'down' ? 'text-red-600' : ''
                                  }`}
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* BOTTOM COMPOSER AREA */}
        <footer
          className={`shrink-0 px-4 sm:px-6 pb-4 pt-2 border-t ${
            isDark
              ? 'bg-slate-950 border-slate-800'
              : 'bg-[#FFFFFF] border-[#E5E7EB]'
          }`}
        >
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Error Banner with Retry */}
            {streamError && (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-200">
                <span>{streamError}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRegenerateLast}
                    className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-red-300 font-semibold cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamError(null)}
                    aria-label="Dismiss error"
                    className="p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Attachment Previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EFF6FF] dark:bg-slate-900 border border-[#BFDBFE] dark:border-slate-700 text-xs"
                  >
                    {att.dataUrl ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded object-cover"
                      />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                    )}
                    <span className="truncate max-w-[160px] font-medium">{att.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                      }
                      aria-label={`Remove attachment ${att.name}`}
                      className="text-[#737373] hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Rounded Message Composer Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className={`rounded-2xl border p-2.5 transition-shadow focus-within:border-[#2563EB] ${
                isDark
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-[#FFFFFF] border-[#E5E7EB] shadow-sm'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,.txt,.md,.csv,.json"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <textarea
                rows={2}
                aria-label="Message input"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  language === 'ta'
                    ? currentToolMeta.placeholderTa
                    : currentToolMeta.placeholderEn
                }
                className={`w-full px-2 py-1 text-sm resize-none focus:outline-none ${
                  isDark
                    ? 'bg-transparent text-slate-100 placeholder:text-slate-500'
                    : 'bg-transparent text-[#171717] placeholder:text-[#737373]'
                }`}
              />

              <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#E5E7EB]/60 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={strings.attachFile}
                    title={strings.attachFile}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isDark
                        ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'border-[#E5E7EB] text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFC]'
                    }`}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    aria-label={strings.voiceInput}
                    title={strings.voiceInput}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isListening
                        ? 'bg-red-600 border-red-600 text-white'
                        : isDark
                        ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'border-[#E5E7EB] text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFC]'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  <span className="text-[11px] text-[#737373] hidden sm:inline pl-1 tabular-nums">
                    {usageData
                      ? `${usageData.usage.requestsRemaining} requests remaining today`
                      : 'Enter to send · Shift+Enter for new line'}
                  </span>
                </div>

                {/* Elegant Electric Blue Send or Stop-Generation Button */}
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStopStreaming}
                    aria-label={strings.stopGenerating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{strings.stopGenerating}</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputPrompt.trim() && attachments.length === 0}
                    aria-label={strings.send}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>{strings.send}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <MemoryPrivacyModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        isDark={isDark}
        memoryEnabled={memoryEnabled}
        onToggleMemoryEnabled={(val) => {
          setMemoryEnabled(val);
          if (currentUser) {
            updateUserProfileInFirestore(currentUser.uid, { memoryEnabled: val }).catch(
              console.error
            );
          }
        }}
        memories={memories}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        conversations={conversations}
        savedMessages={allSavedMessages}
        onExportAllConversations={handleExportAllConversations}
        onClearAllHistory={handleClearAllHistory}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        isDark={isDark}
        usageData={usageData}
        onSwitchPlan={handleSwitchSubscriptionPlan}
      />

      <AdminObservabilityModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isDark={isDark}
        metrics={adminMetrics}
        onRefreshMetrics={fetchAdminMetrics}
      />
    </div>
  );
}
