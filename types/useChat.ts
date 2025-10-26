// types/useChat.ts

export type UIMessage<
  METADATA = unknown,
  DATA_PARTS extends Record<string, any> = {},
  TOOLS extends Record<string, any> = {}
> = {
  id: string;
  role: "system" | "user" | "assistant";
  metadata?: METADATA;
  status: "submitted" | "streaming" | "ready" | "error" | "idle";
  parts: Array<
    | TextUIPart
    | ReasoningUIPart
    | ThinkingUIPart
    | ToolCallUIPart
    | ToolResultUIPart
    | WorkflowStepUIPart
    | SourceUrlUIPart
    | SourceDocumentUIPart
    | FileUIPart
    | DataUIPart<DATA_PARTS>
    | StepStartUIPart
    | ErrorUIPart
  >;
};

// --- Message Parts ---

export type TextUIPart = {
  type: "text";
  text: string;
  state: "streaming" | "done";
  index?: number;
};

export type ReasoningUIPart = {
  type: "reasoning";
  text: string;
  state: "streaming" | "done";
  providerMetadata?: Record<string, any>;
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

export type SourceUrlUIPart = {
  type: "source-url";
  sourceId: string;
  url: string;
  title?: string;
  providerMetadata?: Record<string, any>;
};

export type SourceDocumentUIPart = {
  type: "source-document";
  sourceId: string;
  mediaType: string;
  title: string;
  filename?: string;
  providerMetadata?: Record<string, any>;
};

export type FileUIPart = {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
};

export type DataUIPart<DATA_TYPES extends Record<string, any>> = {
  [NAME in keyof DATA_TYPES & string]: {
    type: `data-${NAME}`;
    id?: string;
    data: DATA_TYPES[NAME];
  };
}[keyof DATA_TYPES & string];

export type StepStartUIPart = {
  type: "step-start";
  stepId?: string;
  title?: string;
};

export type ErrorUIPart = {
  type: "error";
  error: string;
  code?: string;
};

// --- Tool Types ---

export type ToolUIPart<TOOLS extends Record<string, any> = {}> = {
  [NAME in keyof TOOLS & string]: {
    type: `tool-${NAME}`;
    toolCallId: string;
  } & (
    | { state: "input-streaming"; input?: DeepPartial<TOOLS[NAME]> }
    | { state: "input-available"; input: TOOLS[NAME] }
    | {
        state: "output-available";
        input: TOOLS[NAME];
        output: TOOLS[NAME]["output"];
      }
    | { state: "output-error"; input: TOOLS[NAME]; errorText: string }
  );
}[keyof TOOLS & string];

// --- Worker Types ---

export interface WorkerErrorMessage {
  type: "error";
  error: string;
}

export interface WorkerDataMessage {
  type: "data";
  packets: string[];
}

export type WorkerMessage = WorkerDataMessage | WorkerErrorMessage;

// --- Chat State ---

export interface GlobalChatState {
  messages: UIMessage[];
  input: string;
  isLoading: boolean;
  error?: Error;
}

// --- Hook Options ---

export type UseChatOptions<M = unknown, D = {}, T = {}> = {
  id?: string;
  initialMessages?: UIMessage<M, D, T>[];
  initialInput?: string;
  model?: string;
  api?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string> | (() => Record<string, string>);
  body?: Record<string, any>;
  onResponse?: (res: Response) => void | Promise<void>;
  onFinish?: (msg: UIMessage<M, D, T>) => void;
  onError?: (err: Error) => void;
  onToolCall?: (toolCall: ToolCallUIPart) => void;
  onWorkflowStep?: (step: WorkflowStepUIPart) => void;
  sendExtraMessageFields?: boolean;
  streamProtocol?: "text" | "data";
  fetch?: typeof globalThis.fetch;
  keepLastMessageOnError?: boolean;
  experimental_throttle?: number;
  persist?: boolean;
  storageKey?: string;
  maxRetries?: number;
  retryDelay?: number;
};

// --- Hook Helpers ---

export type UseChatHelpers<M = unknown, D = {}, T = {}> = {
  messages: UIMessage<M, D, T>[];
  error: Error | undefined;
  append: (
    msg: UIMessage<M, D, T> | { role: "user"; content: string; data?: any },
    opts?: any
  ) => Promise<void>;
  stop: () => void;
  reload: () => Promise<void>;
  isLoading: boolean;
  input: string;
  setInput: (v: string) => void;
  regenerate: () => void;
  handleSubmit: (e?: any, opts?: any) => void;
  handleInputChange: (e: any) => void;
  setMessages: (m: UIMessage<M, D, T>[]) => void;
  addToolResult: (toolCallId: string, result: any) => void;
  addToolError: (toolCallId: string, error: string) => void;
  clear: () => void;
  removeMessage: (id: string) => void;
  updateMessage: (
    id: string,
    fn: (m: UIMessage<M, D, T>) => UIMessage<M, D, T>
  ) => void;
};

// --- Utility Types ---

export type ValueOf<T> = T[keyof T];
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/* ------------------  MODULE STATE  ------------------ */

export interface GlobalChatState {
  messages: UIMessage[];
  input: string;
  isLoading: boolean;
  error?: Error;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequestBody {
  id: string;
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
}
