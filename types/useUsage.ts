export interface UsageMetrics {
  messagesUsed: number;
  messagesLimit: number;
  tokensUsed: number;
  tokensLimit: number;
  filesUploaded: number;
  filesLimit: number;
  conversationsUsed: number;
  conversationsLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  storageUsed: number; // in MB
  storageLimit: number; // in MB
}

export interface UsageState extends UsageMetrics {
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  resetDate: Date | null;
}

export interface UseUsageReturn extends UsageState {
  // Core methods
  trackMessage: (tokens?: number) => Promise<boolean>;
  trackFileUpload: (fileSize: number) => Promise<boolean>;
  trackConversation: () => Promise<boolean>;
  trackApiCall: () => Promise<boolean>;
  
  // Utility methods
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
  
  // Percentage calculations
  getMessageUsagePercent: () => number;
  getTokenUsagePercent: () => number;
  getStorageUsagePercent: () => number;
  
  // Limit checks
  canSendMessage: () => boolean;
  canUploadFile: (fileSize: number) => boolean;
  canCreateConversation: () => boolean;
  
  // Formatted strings
  getMessagesRemaining: () => string;
  getTokensRemaining: () => string;
  getStorageRemaining: () => string;
}