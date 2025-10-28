// Message status types
export type MessageStatus =
  | "submitted"
  | "streaming"
  | "ready"
  | "error"
  | "idle";

// UI Message parts - optimized for minimal re-renders
export type TextUIPart = {
  type: "text";
  text: string;
  state: "streaming" | "done";
};

export type ReasoningUIPart = {
  type: "reasoning";
  text: string;
  state: "streaming" | "done";
  metadata?: Record<string, any>;
  _gen?: number;
};

export type ThinkingUIPart = {
  type: "thinking";
  text: string;
  state: "streaming" | "done";
  title?: string;
};

export type ToolCallUIPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: any;
  state: "streaming" | "complete" | "executing" | "error";
};

export type ToolResultUIPart = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: any;
  error?: string;
  state: "done";
};

export type WorkflowStepUIPart = {
  type: "workflow-step";
  stepId: string;
  title: string;
  description?: string;
  status: "pending" | "running" | "completed" | "error";
  progress?: number;
  metadata?: Record<string, any>;
};

export type FileUIPart = {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
  size?: number;
};

export type ErrorUIPart = {
  type: "error";
  error: string;
  code?: string;
};

// Main UI Message type
export type UIMessage<
  DATA_PARTS extends Record<string, any> = Record<string, any>
> = {
  id: string;
  role: "system" | "user" | "assistant";
  metadata?: {
    tokens?: number;
    cost?: number;
    timestamp?: number;
    model?: string;
    [key: string]: any; // Allow other custom fields
  };
  status: MessageStatus;
  parts: Array<
    | TextUIPart
    | ReasoningUIPart
    | ThinkingUIPart
    | ToolCallUIPart
    | ToolResultUIPart
    | WorkflowStepUIPart
    | FileUIPart
    | ErrorUIPart
  >;
};

// Chat message for API
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

// Usage statistics
export interface UsageStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  models?: Record<
    string,
    {
      promptTokens: number;
      completionTokens: number;
      reasoningTokens: number;
      totalTokens: number;
      requests: number;
    }
  >;
}

// Feature flags
export interface ChatFeatures {
  reasoning?: boolean;
  thinking?: boolean;
  toolCalling?: boolean;
  workflow?: boolean;
  fileHandling?: boolean;
}

// Hook options
export type UseChatOptions<
  M = unknown,
  D extends Record<string, any> = Record<string, any>
> = {
  id?: string;
  initialMessages?: UIMessage<M, D>[];
  initialInput?: string;
  model?: string;
  api?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string> | (() => Record<string, string>);
  body?: Record<string, any>;
  features?: Partial<ChatFeatures>;
  onResponse?: (res: Response) => void | Promise<void>;
  onFinish?: (msg: UIMessage<M, D>) => void;
  onError?: (err: Error) => void;
  onToolCall?: (toolCall: ToolCallUIPart) => void;
  onWorkflowStep?: (step: WorkflowStepUIPart) => void;
  keepLastMessageOnError?: boolean;
  persist?: boolean;
  storageKey?: string;
  maxRetries?: number;
  retryDelay?: number;
};

// Hook return type
export type UseChatHelpers<
  M = unknown,
  D extends Record<string, any> = Record<string, any>
> = {
  messages: UIMessage<M, D>[];
  error: Error | undefined;
  isLoading: boolean;
  input: string;
  usage: UsageStats;
  features: ChatFeatures;
  append: (
    msg:
      | UIMessage<M, D>
      | { role: "user"; content: string; data?: any; files?: File[] }
  ) => Promise<void>;
  stop: () => void;
  reload: () => Promise<void>;
  setInput: (v: string) => void;
  regenerate: () => Promise<void>;
  handleSubmit: (e?: any, opts?: any) => void;
  handleInputChange: (e: any) => void;
  setMessages: (m: UIMessage<M, D>[]) => void;
  clear: () => void;
  processFile: (file: File) => Promise<any>;
};

// API request body
export interface ChatRequestBody {
  id?: string;
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  features?: ChatFeatures;
}
