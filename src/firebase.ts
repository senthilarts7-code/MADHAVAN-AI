import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  ConversationItem,
  ChatMessage,
  UserMemoryItem,
  UserProfileData,
} from './types';
import { WorkspaceToolMode } from './utils/aiLogic';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Mandatory connection validation on boot per firebase-integration-rpc skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function timestampToIso(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { User };

export async function ensureUserProfileInFirestore(user: User): Promise<UserProfileData> {
  const uid = sanitizeId(user.uid);
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      return {
        uid: String(d.uid || uid),
        displayName: String(d.displayName || user.displayName || 'Madhavan User'),
        email: String(d.email || user.email || 'user@example.com'),
        language: d.language === 'ta' ? 'ta' : 'en',
        theme: d.theme === 'dark' || d.theme === 'system' ? d.theme : 'light',
        memoryEnabled: Boolean(d.memoryEnabled ?? true),
        plan: d.plan === 'pro' ? 'pro' : 'free',
        createdAt: timestampToIso(d.createdAt),
        updatedAt: timestampToIso(d.updatedAt),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  const newProfile = {
    uid,
    displayName: (user.displayName || 'Madhavan User').slice(0, 100),
    email: (user.email || 'user@example.com').slice(0, 254),
    language: 'en' as const,
    theme: 'light' as const,
    memoryEnabled: true,
    plan: 'free' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, newProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  const nowIso = new Date().toISOString();
  return {
    ...newProfile,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export async function updateUserProfileInFirestore(
  uid: string,
  updates: Partial<Pick<UserProfileData, 'displayName' | 'language' | 'theme' | 'memoryEnabled' | 'plan'>>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  const ref = doc(db, 'users', safeUid);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.displayName !== undefined) payload.displayName = updates.displayName.slice(0, 100);
  if (updates.language !== undefined) payload.language = updates.language;
  if (updates.theme !== undefined) payload.theme = updates.theme;
  if (updates.memoryEnabled !== undefined) payload.memoryEnabled = updates.memoryEnabled;
  if (updates.plan !== undefined) payload.plan = updates.plan;

  try {
    await updateDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function listUserConversations(uid: string): Promise<ConversationItem[]> {
  const safeUid = sanitizeId(uid);
  const path = 'conversations';
  try {
    const q = query(collection(db, 'conversations'), where('ownerId', '==', safeUid));
    const snap = await getDocs(q);
    const items: ConversationItem[] = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: String(d.id || docSnap.id),
        ownerId: String(d.ownerId || safeUid),
        title: String(d.title || 'New Conversation'),
        toolMode: (d.toolMode as WorkspaceToolMode) || 'chat',
        modelId: String(d.modelId || 'auto'),
        pinned: Boolean(d.pinned),
        archived: Boolean(d.archived),
        summary: String(d.summary || ''),
        messageCount: Number(d.messageCount || 0),
        createdAt: timestampToIso(d.createdAt),
        updatedAt: timestampToIso(d.updatedAt),
      };
    });
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveConversationInFirestore(
  conv: ConversationItem,
  isNew: boolean
): Promise<void> {
  const safeId = sanitizeId(conv.id);
  const safeOwnerId = sanitizeId(conv.ownerId);
  const path = `conversations/${safeId}`;
  const ref = doc(db, 'conversations', safeId);

  if (isNew) {
    try {
      await setDoc(ref, {
        id: safeId,
        ownerId: safeOwnerId,
        title: (conv.title || 'New Conversation').slice(0, 200),
        toolMode: (conv.toolMode || 'chat').slice(0, 40),
        modelId: (conv.modelId || 'auto').slice(0, 60),
        pinned: Boolean(conv.pinned),
        archived: Boolean(conv.archived),
        summary: (conv.summary || '').slice(0, 2000),
        messageCount: Math.max(0, Math.min(10000, Math.floor(conv.messageCount || 0))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(ref, {
        title: (conv.title || 'New Conversation').slice(0, 200),
        toolMode: (conv.toolMode || 'chat').slice(0, 40),
        modelId: (conv.modelId || 'auto').slice(0, 60),
        pinned: Boolean(conv.pinned),
        archived: Boolean(conv.archived),
        summary: (conv.summary || '').slice(0, 2000),
        messageCount: Math.max(0, Math.min(10000, Math.floor(conv.messageCount || 0))),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function deleteConversationInFirestore(conversationId: string): Promise<void> {
  const safeId = sanitizeId(conversationId);
  const path = `conversations/${safeId}`;
  try {
    await deleteDoc(doc(db, 'conversations', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listConversationMessages(
  conversationId: string,
  uid: string
): Promise<ChatMessage[]> {
  const safeConvId = sanitizeId(conversationId);
  const safeUid = sanitizeId(uid);
  const path = `conversations/${safeConvId}/messages`;
  try {
    const q = query(
      collection(db, 'conversations', safeConvId, 'messages'),
      where('ownerId', '==', safeUid)
    );
    const snap = await getDocs(q);
    const msgs: ChatMessage[] = snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: String(d.id || docSnap.id),
        conversationId: String(d.conversationId || safeConvId),
        ownerId: String(d.ownerId || safeUid),
        role: d.role === 'assistant' ? 'assistant' : 'user',
        content: String(d.content || ''),
        modelId: String(d.modelId || 'gemini-3.8-flash'),
        attachmentName: String(d.attachmentName || ''),
        attachmentType: String(d.attachmentType || ''),
        ttftMs: Number(d.ttftMs || 0),
        totalDurationMs: Number(d.totalDurationMs || 0),
        saved: Boolean(d.saved),
        createdAt: timestampToIso(d.createdAt),
        updatedAt: timestampToIso(d.updatedAt),
      };
    });
    return msgs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveMessageInFirestore(msg: ChatMessage, isNew: boolean): Promise<void> {
  const safeConvId = sanitizeId(msg.conversationId);
  const safeMsgId = sanitizeId(msg.id);
  const safeOwnerId = sanitizeId(msg.ownerId);
  const path = `conversations/${safeConvId}/messages/${safeMsgId}`;
  const ref = doc(db, 'conversations', safeConvId, 'messages', safeMsgId);

  if (isNew) {
    try {
      await setDoc(ref, {
        id: safeMsgId,
        conversationId: safeConvId,
        ownerId: safeOwnerId,
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: (msg.content || ' ').slice(0, 50000),
        modelId: (msg.modelId || 'gemini-3.8-flash').slice(0, 60),
        attachmentName: (msg.attachmentName || '').slice(0, 255),
        attachmentType: (msg.attachmentType || '').slice(0, 100),
        ttftMs: Math.max(0, Number(msg.ttftMs || 0)),
        totalDurationMs: Math.max(0, Number(msg.totalDurationMs || 0)),
        saved: Boolean(msg.saved),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(ref, {
        content: (msg.content || ' ').slice(0, 50000),
        saved: Boolean(msg.saved),
        ttftMs: Math.max(0, Number(msg.ttftMs || 0)),
        totalDurationMs: Math.max(0, Number(msg.totalDurationMs || 0)),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function listUserMemories(uid: string): Promise<UserMemoryItem[]> {
  const safeUid = sanitizeId(uid);
  const path = 'memories';
  try {
    const q = query(collection(db, 'memories'), where('ownerId', '==', safeUid));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: String(d.id || docSnap.id),
        ownerId: String(d.ownerId || safeUid),
        fact: String(d.fact || ''),
        category: String(d.category || 'preference'),
        createdAt: timestampToIso(d.createdAt),
        updatedAt: timestampToIso(d.updatedAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createUserMemoryInFirestore(mem: UserMemoryItem): Promise<void> {
  const safeId = sanitizeId(mem.id);
  const safeOwner = sanitizeId(mem.ownerId);
  const path = `memories/${safeId}`;
  try {
    await setDoc(doc(db, 'memories', safeId), {
      id: safeId,
      ownerId: safeOwner,
      fact: mem.fact.slice(0, 1000),
      category: (mem.category || 'preference').slice(0, 50),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserMemoryInFirestore(memoryId: string): Promise<void> {
  const safeId = sanitizeId(memoryId);
  const path = `memories/${safeId}`;
  try {
    await deleteDoc(doc(db, 'memories', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function submitFeedbackInFirestore(params: {
  id: string;
  ownerId: string;
  conversationId: string;
  rating: 'up' | 'down';
  comment: string;
}): Promise<void> {
  const safeId = sanitizeId(params.id);
  const path = `feedback/${safeId}`;
  try {
    await setDoc(doc(db, 'feedback', safeId), {
      id: safeId,
      ownerId: sanitizeId(params.ownerId),
      conversationId: sanitizeId(params.conversationId),
      rating: params.rating,
      comment: (params.comment || '').slice(0, 1000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
