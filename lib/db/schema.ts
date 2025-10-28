import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  integer,
  varchar,
  index,
  uniqueIndex,
  bigint,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  phone: text("phone").notNull(),
  plan: text("plan").default("free").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

import { relations } from "drizzle-orm";

// ===========================================
// ENUMS
// ===========================================

export const messageRoleEnum = pgEnum("message_role", [
  "system",
  "user",
  "assistant",
]);

export const MessagestatusEnum = pgEnum("message_status", [
  "idle",
  "submitted",
  "streaming",
  "ready",
  "error",
]);

export const partTypeEnum = pgEnum("part_type", [
  "text",
  "reasoning",
  "thinking",
  "tool-call",
  "tool-result",
  "workflow-step",
  "file",
  "error",
]);

export const partStateEnum = pgEnum("part_state", [
  "streaming",
  "done",
  "complete",
  "executing",
  "error",
]);

export const workflowStatusEnum = pgEnum("workflow_status", [
  "pending",
  "running",
  "completed",
  "error",
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "pro",
  "enterprise",
]);

// ===========================================
// CHAT THREADS TABLE
// ===========================================

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Thread info
    title: varchar("title", { length: 500 }),
    description: text("description"),

    // Configuration
    model: varchar("model", { length: 100 }).notNull().default("gpt-4o-mini"),
    temperature: decimal("temperature", { precision: 3, scale: 2 }).default(
      "0.70"
    ),
    maxTokens: integer("max_tokens").default(2048),

    // Features enabled for this thread
    features: jsonb("features")
      .$type<{
        reasoning: boolean;
        thinking: boolean;
        toolCalling: boolean;
        workflow: boolean;
        fileHandling: boolean;
      }>()
      .notNull(),

    // Thread state
    isArchived: boolean("is_archived").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),

    // Statistics
    messageCount: integer("message_count").notNull().default(0),
    totalTokensUsed: bigint("total_tokens_used", { mode: "number" })
      .notNull()
      .default(0),

    // Metadata
    metadata: jsonb("metadata"),
    tags: jsonb("tags").$type<string[]>().default([]),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at"),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userIdIdx: index("chat_threads_user_id_idx").on(table.userId),
    createdAtIdx: index("chat_threads_created_at_idx").on(table.createdAt),
    lastMessageAtIdx: index("chat_threads_last_message_at_idx").on(
      table.lastMessageAt
    ),
    archivedIdx: index("chat_threads_archived_idx").on(table.isArchived),
    deletedAtIdx: index("chat_threads_deleted_at_idx").on(table.deletedAt),
  })
);

// ===========================================
// Messages TABLE
// ===========================================

export const Messages = pgTable(
  "Messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),

    // Message basic info
    role: messageRoleEnum("role").notNull(),
    status: MessagestatusEnum("status").notNull().default("idle"),

    // Ordering within thread
    sequenceNumber: integer("sequence_number").notNull(),

    // Parent message for threading (optional)
    parentMessageId: uuid("parent_message_id").references(() => user.id),

    // Token usage for this message
    promptTokens: integer("prompt_tokens").default(0),
    completionTokens: integer("completion_tokens").default(0),
    totalTokens: integer("total_tokens").default(0),

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    threadIdIdx: index("Messages_thread_id_idx").on(table.threadId),
    threadSequenceIdx: index("Messages_thread_sequence_idx").on(
      table.threadId,
      table.sequenceNumber
    ),
    roleIdx: index("Messages_role_idx").on(table.role),
    createdAtIdx: index("Messages_created_at_idx").on(table.createdAt),
    parentMessageIdx: index("Messages_parent_message_idx").on(
      table.parentMessageId
    ),
    deletedAtIdx: index("Messages_deleted_at_idx").on(table.deletedAt),
  })
);

// ===========================================
// MESSAGE PARTS TABLE
// ===========================================

export const messageParts = pgTable(
  "message_parts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => Messages.id, { onDelete: "cascade" }),

    // Part info
    type: partTypeEnum("type").notNull(),
    state: partStateEnum("state").notNull().default("done"),

    // Ordering within message
    sequenceNumber: integer("sequence_number").notNull(),

    // Content (stored based on type)
    textContent: text("text_content"), // For text, reasoning, thinking
    jsonContent: jsonb("json_content"), // For tool-call, tool-result, workflow-step, file

    // Additional fields for specific types
    title: varchar("title", { length: 255 }), // For thinking, workflow-step
    toolCallId: varchar("tool_call_id", { length: 100 }), // For tool-call, tool-result
    toolName: varchar("tool_name", { length: 100 }), // For tool-call, tool-result

    // Workflow specific
    workflowStepId: varchar("workflow_step_id", { length: 100 }),
    workflowStatus: workflowStatusEnum("workflow_status"),
    workflowProgress: integer("workflow_progress"), // 0-100

    // File specific
    fileMediaType: varchar("file_media_type", { length: 100 }),
    fileName: varchar("file_name", { length: 255 }),
    fileUrl: text("file_url"),
    fileSize: bigint("file_size", { mode: "number" }),

    // Error specific
    errorCode: varchar("error_code", { length: 50 }),

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    messageIdIdx: index("message_parts_message_id_idx").on(table.messageId),
    MessagesequenceIdx: index("message_parts_message_sequence_idx").on(
      table.messageId,
      table.sequenceNumber
    ),
    typeIdx: index("message_parts_type_idx").on(table.type),
    toolCallIdIdx: index("message_parts_tool_call_id_idx").on(table.toolCallId),
    workflowStepIdIdx: index("message_parts_workflow_step_id_idx").on(
      table.workflowStepId
    ),
  })
);

// ===========================================
// USAGE STATISTICS TABLE
// ===========================================

export const usageStatistics = pgTable(
  "usage_statistics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => chatThreads.id, {
      onDelete: "cascade",
    }),

    // Time period (for aggregation)
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    periodType: varchar("period_type", { length: 20 }).notNull(), // 'hourly', 'daily', 'monthly'

    // Token usage
    promptTokens: bigint("prompt_tokens", { mode: "number" })
      .notNull()
      .default(0),
    completionTokens: bigint("completion_tokens", { mode: "number" })
      .notNull()
      .default(0),
    totalTokens: bigint("total_tokens", { mode: "number" })
      .notNull()
      .default(0),

    // Request counts
    totalRequests: integer("total_requests").notNull().default(0),
    successfulRequests: integer("successful_requests").notNull().default(0),
    failedRequests: integer("failed_requests").notNull().default(0),

    // Feature usage
    reasoningRequests: integer("reasoning_requests").notNull().default(0),
    thinkingRequests: integer("thinking_requests").notNull().default(0),
    toolCallRequests: integer("tool_call_requests").notNull().default(0),
    workflowRequests: integer("workflow_requests").notNull().default(0),
    fileUploadRequests: integer("file_upload_requests").notNull().default(0),

    // Cost tracking (in cents)
    estimatedCost: decimal("estimated_cost", {
      precision: 10,
      scale: 2,
    }).default("0.00"),

    // Model usage breakdown
    modelUsage: jsonb("model_usage")
      .$type<Record<string, number>>()
      .default({}),

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("usage_statistics_user_id_idx").on(table.userId),
    threadIdIdx: index("usage_statistics_thread_id_idx").on(table.threadId),
    periodIdx: index("usage_statistics_period_idx").on(
      table.userId,
      table.periodType,
      table.periodStart
    ),
    periodStartIdx: index("usage_statistics_period_start_idx").on(
      table.periodStart
    ),
    uniquePeriodIdx: uniqueIndex("usage_statistics_unique_period_idx").on(
      table.userId,
      table.threadId,
      table.periodType,
      table.periodStart
    ),
  })
);

// ===========================================
// TOOL EXECUTIONS TABLE
// ===========================================

export const toolExecutions = pgTable(
  "tool_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messagePartId: uuid("message_part_id")
      .notNull()
      .references(() => messageParts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),

    // Tool info
    toolCallId: varchar("tool_call_id", { length: 100 }).notNull(),
    toolName: varchar("tool_name", { length: 100 }).notNull(),

    // Execution details
    inputArgs: jsonb("input_args").notNull(),
    result: jsonb("result"),
    error: text("error"),

    // Execution metrics
    executionTimeMs: integer("execution_time_ms"),
    status: varchar("status", { length: 20 }).notNull(), // 'pending', 'executing', 'completed', 'failed'

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    messagePartIdIdx: index("tool_executions_message_part_id_idx").on(
      table.messagePartId
    ),
    userIdIdx: index("tool_executions_user_id_idx").on(table.userId),
    threadIdIdx: index("tool_executions_thread_id_idx").on(table.threadId),
    toolCallIdIdx: index("tool_executions_tool_call_id_idx").on(
      table.toolCallId
    ),
    toolNameIdx: index("tool_executions_tool_name_idx").on(table.toolName),
    statusIdx: index("tool_executions_status_idx").on(table.status),
    createdAtIdx: index("tool_executions_created_at_idx").on(table.createdAt),
  })
);

// ===========================================
// FILES TABLE
// ===========================================

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => chatThreads.id, {
      onDelete: "cascade",
    }),
    messagePartId: uuid("message_part_id").references(() => messageParts.id, {
      onDelete: "cascade",
    }),

    // File info
    fileName: varchar("file_name", { length: 255 }).notNull(),
    originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
    mediaType: varchar("media_type", { length: 100 }).notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),

    // Storage info
    storageProvider: varchar("storage_provider", { length: 50 }).notNull(), // 's3', 'cloudinary', etc.
    storagePath: text("storage_path").notNull(),
    storageUrl: text("storage_url").notNull(),

    // File processing
    isProcessed: boolean("is_processed").notNull().default(false),
    processingStatus: varchar("processing_status", { length: 20 }), // 'pending', 'processing', 'completed', 'failed'
    processingError: text("processing_error"),

    // File metadata
    width: integer("width"), // For images
    height: integer("height"), // For images
    duration: integer("duration"), // For audio/video in seconds
    extractedText: text("extracted_text"), // For documents

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    userIdIdx: index("files_user_id_idx").on(table.userId),
    threadIdIdx: index("files_thread_id_idx").on(table.threadId),
    messagePartIdIdx: index("files_message_part_id_idx").on(
      table.messagePartId
    ),
    mediaTypeIdx: index("files_media_type_idx").on(table.mediaType),
    createdAtIdx: index("files_created_at_idx").on(table.createdAt),
    deletedAtIdx: index("files_deleted_at_idx").on(table.deletedAt),
  })
);

// ===========================================
// API KEYS TABLE
// ===========================================

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Key info
    name: varchar("name", { length: 100 }).notNull(),
    keyHash: varchar("key_hash", { length: 255 }).notNull(), // Hashed API key
    keyPrefix: varchar("key_prefix", { length: 20 }).notNull(), // First few chars for identification

    // Permissions
    permissions: jsonb("permissions").$type<string[]>().default([]),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Usage limits
    rateLimit: integer("rate_limit"), // Requests per minute
    monthlyLimit: integer("monthly_limit"), // Total requests per month

    // Usage tracking
    totalRequests: bigint("total_requests", { mode: "number" })
      .notNull()
      .default(0),
    lastUsedAt: timestamp("last_used_at"),

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => ({
    userIdIdx: index("api_keys_user_id_idx").on(table.userId),
    keyHashIdx: uniqueIndex("api_keys_key_hash_idx").on(table.keyHash),
    keyPrefixIdx: index("api_keys_key_prefix_idx").on(table.keyPrefix),
    isActiveIdx: index("api_keys_is_active_idx").on(table.isActive),
  })
);

// ===========================================
// AUDIT LOGS TABLE
// ===========================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),

    // Action info
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: uuid("resource_id"),

    // Request info
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    // Changes
    previousData: jsonb("previous_data"),
    newData: jsonb("new_data"),

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamp
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    resourceIdx: index("audit_logs_resource_idx").on(
      table.resourceType,
      table.resourceId
    ),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);

// ===========================================
// RELATIONS
// ===========================================

export const userRelations = relations(user, ({ many }) => ({
  chatThreads: many(chatThreads),
  usageStatistics: many(usageStatistics),
  toolExecutions: many(toolExecutions),
  files: many(files),
  apiKeys: many(apiKeys),
  auditLogs: many(auditLogs),
}));

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  user: one(user, {
    fields: [chatThreads.userId],
    references: [user.id],
  }),
  Messages: many(Messages),
  usageStatistics: many(usageStatistics),
  toolExecutions: many(toolExecutions),
  files: many(files),
}));

export const MessagesRelations = relations(Messages, ({ one, many }) => ({
  thread: one(chatThreads, {
    fields: [Messages.threadId],
    references: [chatThreads.id],
  }),
  parentMessage: one(Messages, {
    fields: [Messages.parentMessageId],
    references: [Messages.id],
  }),
  childMessages: many(Messages),
  parts: many(messageParts),
}));

export const messagePartsRelations = relations(
  messageParts,
  ({ one, many }) => ({
    message: one(Messages, {
      fields: [messageParts.messageId],
      references: [Messages.id],
    }),
    toolExecutions: many(toolExecutions),
    files: many(files),
  })
);

export const usageStatisticsRelations = relations(
  usageStatistics,
  ({ one }) => ({
    user: one(user, {
      fields: [usageStatistics.userId],
      references: [user.id],
    }),
    thread: one(chatThreads, {
      fields: [usageStatistics.threadId],
      references: [chatThreads.id],
    }),
  })
);

export const toolExecutionsRelations = relations(toolExecutions, ({ one }) => ({
  messagePart: one(messageParts, {
    fields: [toolExecutions.messagePartId],
    references: [messageParts.id],
  }),
  user: one(user, {
    fields: [toolExecutions.userId],
    references: [user.id],
  }),
  thread: one(chatThreads, {
    fields: [toolExecutions.threadId],
    references: [chatThreads.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(user, {
    fields: [files.userId],
    references: [user.id],
  }),
  thread: one(chatThreads, {
    fields: [files.threadId],
    references: [chatThreads.id],
  }),
  messagePart: one(messageParts, {
    fields: [files.messagePartId],
    references: [messageParts.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(user, {
    fields: [apiKeys.userId],
    references: [user.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(user, {
    fields: [auditLogs.userId],
    references: [user.id],
  }),
}));

// ===========================================
// TYPE EXPORTS
// ===========================================

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;

export type Message = typeof Messages.$inferSelect;
export type NewMessage = typeof Messages.$inferInsert;

export type MessagePart = typeof messageParts.$inferSelect;
export type NewMessagePart = typeof messageParts.$inferInsert;

export type UsageStatistic = typeof usageStatistics.$inferSelect;
export type NewUsageStatistic = typeof usageStatistics.$inferInsert;

export type ToolExecution = typeof toolExecutions.$inferSelect;
export type NewToolExecution = typeof toolExecutions.$inferInsert;

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
