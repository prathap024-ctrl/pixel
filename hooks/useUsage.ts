// hooks/useUsage.ts
import { useState, useEffect, useCallback } from "react";
import { usePlan } from "./usePlan";
import { UsageMetrics, UsageState, UseUsageReturn } from "@/types/useUsage";

const STORAGE_KEY = "usage_metrics";
const API_ENDPOINT = "/api/usage";

export function useUsage(userId?: string): UseUsageReturn {
  const { plan } = usePlan();

  const [state, setState] = useState<UsageState>({
    messagesUsed: 0,
    messagesLimit: plan.limits.messages,
    tokensUsed: 0,
    tokensLimit: plan.limits.tokens,
    filesUploaded: 0,
    filesLimit: plan.limits.files,
    conversationsUsed: 0,
    conversationsLimit: plan.limits.conversations,
    apiCallsUsed: 0,
    apiCallsLimit: plan.limits.apiCalls,
    storageUsed: 0,
    storageLimit: plan.limits.storage,
    isLoading: false,
    error: null,
    lastUpdated: null,
    resetDate: null,
  });

  // Load from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Sync with plan limits
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      messagesLimit: plan.limits.messages,
      tokensLimit: plan.limits.tokens,
      filesLimit: plan.limits.files,
      conversationsLimit: plan.limits.conversations,
      apiCallsLimit: plan.limits.apiCalls,
      storageLimit: plan.limits.storage,
    }));
  }, [plan]);

  // Auto-refresh from server every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  // Load from localStorage
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setState((prev) => ({
          ...prev,
          ...data,
          lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : null,
          resetDate: data.resetDate ? new Date(data.resetDate) : null,
        }));
      }
    } catch (error) {
      console.error("Failed to load usage from storage:", error);
    }
  };

  // Save to localStorage
  const saveToStorage = useCallback((data: Partial<UsageState>) => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY}_${userId}`,
        JSON.stringify({
          ...data,
          lastUpdated: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("Failed to save usage to storage:", error);
    }
  }, [userId]);

  // Sync with server
  const syncWithServer = useCallback(
    async (metrics: Partial<UsageMetrics>) => {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            metrics,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to sync usage with server");
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Failed to sync with server:", error);
        throw error;
      }
    },
    [userId]
  );

  // Refresh from server
  const refresh = useCallback(async () => {
    if (!userId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_ENDPOINT}?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch usage");

      const data = await response.json();
      const newState = {
        ...state,
        ...data.metrics,
        resetDate: data.resetDate ? new Date(data.resetDate) : null,
        lastUpdated: new Date(),
        isLoading: false,
      };

      setState(newState);
      saveToStorage(newState);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as Error,
        isLoading: false,
      }));
    }
  }, [userId, saveToStorage]);

  // Track message
  const trackMessage = useCallback(
    async (tokens = 0): Promise<boolean> => {
      // Check limits
      if (state.messagesUsed >= state.messagesLimit) {
        return false;
      }

      const newMessagesUsed = state.messagesUsed + 1;
      const newTokensUsed = state.tokensUsed + tokens;
      const newApiCallsUsed = state.apiCallsUsed + 1;

      // Update local state immediately
      const newState = {
        ...state,
        messagesUsed: newMessagesUsed,
        tokensUsed: newTokensUsed,
        apiCallsUsed: newApiCallsUsed,
        lastUpdated: new Date(),
      };

      setState(newState);
      saveToStorage(newState);

      // Sync with server in background
      try {
        await syncWithServer({
          messagesUsed: newMessagesUsed,
          tokensUsed: newTokensUsed,
          apiCallsUsed: newApiCallsUsed,
        });
      } catch (error) {
        console.error("Failed to sync message tracking:", error);
      }

      return true;
    },
    [state, saveToStorage, syncWithServer]
  );

  // Track file upload
  const trackFileUpload = useCallback(
    async (fileSize: number): Promise<boolean> => {
      const fileSizeMB = fileSize / (1024 * 1024);

      // Check limits
      if (state.filesUploaded >= state.filesLimit) {
        return false;
      }

      if (state.storageUsed + fileSizeMB > state.storageLimit) {
        return false;
      }

      const newFilesUploaded = state.filesUploaded + 1;
      const newStorageUsed = state.storageUsed + fileSizeMB;

      const newState = {
        ...state,
        filesUploaded: newFilesUploaded,
        storageUsed: newStorageUsed,
        lastUpdated: new Date(),
      };

      setState(newState);
      saveToStorage(newState);

      try {
        await syncWithServer({
          filesUploaded: newFilesUploaded,
          storageUsed: newStorageUsed,
        });
      } catch (error) {
        console.error("Failed to sync file upload:", error);
      }

      return true;
    },
    [state, saveToStorage, syncWithServer]
  );

  // Track conversation
  const trackConversation = useCallback(async (): Promise<boolean> => {
    if (state.conversationsUsed >= state.conversationsLimit) {
      return false;
    }

    const newConversationsUsed = state.conversationsUsed + 1;

    const newState = {
      ...state,
      conversationsUsed: newConversationsUsed,
      lastUpdated: new Date(),
    };

    setState(newState);
    saveToStorage(newState);

    try {
      await syncWithServer({ conversationsUsed: newConversationsUsed });
    } catch (error) {
      console.error("Failed to sync conversation:", error);
    }

    return true;
  }, [state, saveToStorage, syncWithServer]);

  // Track API call
  const trackApiCall = useCallback(async (): Promise<boolean> => {
    if (state.apiCallsUsed >= state.apiCallsLimit) {
      return false;
    }

    const newApiCallsUsed = state.apiCallsUsed + 1;

    const newState = {
      ...state,
      apiCallsUsed: newApiCallsUsed,
      lastUpdated: new Date(),
    };

    setState(newState);
    saveToStorage(newState);

    try {
      await syncWithServer({ apiCallsUsed: newApiCallsUsed });
    } catch (error) {
      console.error("Failed to sync API call:", error);
    }

    return true;
  }, [state, saveToStorage, syncWithServer]);

  // Reset usage
  const reset = useCallback(async () => {
    const resetState = {
      ...state,
      messagesUsed: 0,
      tokensUsed: 0,
      filesUploaded: 0,
      conversationsUsed: 0,
      apiCallsUsed: 0,
      storageUsed: 0,
      lastUpdated: new Date(),
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };

    setState(resetState);
    saveToStorage(resetState);

    try {
      await syncWithServer(resetState);
    } catch (error) {
      console.error("Failed to sync reset:", error);
    }
  }, [state, saveToStorage, syncWithServer]);

  // Percentage calculations
  const getMessageUsagePercent = useCallback(
    () => (state.messagesUsed / state.messagesLimit) * 100,
    [state.messagesUsed, state.messagesLimit]
  );

  const getTokenUsagePercent = useCallback(
    () => (state.tokensUsed / state.tokensLimit) * 100,
    [state.tokensUsed, state.tokensLimit]
  );

  const getStorageUsagePercent = useCallback(
    () => (state.storageUsed / state.storageLimit) * 100,
    [state.storageUsed, state.storageLimit]
  );

  // Limit checks
  const canSendMessage = useCallback(
    () => state.messagesUsed < state.messagesLimit,
    [state.messagesUsed, state.messagesLimit]
  );

  const canUploadFile = useCallback(
    (fileSize: number) => {
      const fileSizeMB = fileSize / (1024 * 1024);
      return (
        state.filesUploaded < state.filesLimit &&
        state.storageUsed + fileSizeMB <= state.storageLimit
      );
    },
    [state.filesUploaded, state.filesLimit, state.storageUsed, state.storageLimit]
  );

  const canCreateConversation = useCallback(
    () => state.conversationsUsed < state.conversationsLimit,
    [state.conversationsUsed, state.conversationsLimit]
  );

  // Formatted strings
  const getMessagesRemaining = useCallback(
    () =>
      `${state.messagesLimit - state.messagesUsed} / ${state.messagesLimit}`,
    [state.messagesUsed, state.messagesLimit]
  );

  const getTokensRemaining = useCallback(
    () => `${state.tokensLimit - state.tokensUsed} / ${state.tokensLimit}`,
    [state.tokensUsed, state.tokensLimit]
  );

  const getStorageRemaining = useCallback(
    () =>
      `${(state.storageLimit - state.storageUsed).toFixed(2)} MB / ${state.storageLimit} MB`,
    [state.storageUsed, state.storageLimit]
  );

  return {
    ...state,
    trackMessage,
    trackFileUpload,
    trackConversation,
    trackApiCall,
    refresh,
    reset,
    getMessageUsagePercent,
    getTokenUsagePercent,
    getStorageUsagePercent,
    canSendMessage,
    canUploadFile,
    canCreateConversation,
    getMessagesRemaining,
    getTokensRemaining,
    getStorageRemaining,
  };
}