/* ---------- Animation Variants ---------- */
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

const progressAnimation = {
  width: ["0%", "100%"],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: "linear",
  },
};

/* ---------- Component Helpers ---------- */

const ThinkingCard: React.FC<{
  title?: string;
  text: string;
  state: string;
}> = ({ title, text, state }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={fadeInUp}
    className="my-3 p-4 rounded-lg border border-purple-200 bg-purple-50"
  >
    <div className="flex items-center gap-2 mb-2">
      <motion.div animate={state === "streaming" ? pulseAnimation : {}}>
        <Brain className="w-5 h-5 text-purple-600" />
      </motion.div>
      <span className="text-sm font-semibold text-purple-800">
        {title || "Thinking..."}
      </span>
      {state === "streaming" && (
        <div className="ml-auto flex gap-1">
          <motion.div
            className="w-2 h-2 bg-purple-600 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-purple-600 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-purple-600 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      )}
    </div>
    <p className="text-sm text-purple-700 whitespace-pre-wrap">{text}</p>
  </motion.div>
);

const ReasoningCard: React.FC<{ text: string; state: string }> = ({
  text,
  state,
}) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={fadeInUp}
    className="my-3 p-4 rounded-lg border border-blue-200 bg-blue-50"
  >
    <div className="flex items-center gap-2 mb-2">
      <motion.div animate={state === "streaming" ? pulseAnimation : {}}>
        <Lightbulb className="w-5 h-5 text-blue-600" />
      </motion.div>
      <span className="text-sm font-semibold text-blue-800">Reasoning</span>
      {state === "streaming" && (
        <Loader2 className="w-4 h-4 text-blue-600 animate-spin ml-auto" />
      )}
    </div>
    <p className="text-sm text-blue-700 whitespace-pre-wrap">{text}</p>
  </motion.div>
);

const ToolCallCard: React.FC<{
  toolName: string;
  args: any;
  state: string;
}> = ({ toolName, args, state }) => {
  const statusConfig = {
    streaming: { icon: Loader2, color: "gray", label: "Preparing..." },
    executing: { icon: Loader2, color: "blue", label: "Executing..." },
    complete: { icon: CheckCircle, color: "green", label: "Complete" },
    error: { icon: XCircle, color: "red", label: "Error" },
  };

  const config =
    statusConfig[state as keyof typeof statusConfig] || statusConfig.streaming;
  const Icon = config.icon;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeInUp}
      className={`my-3 p-4 rounded-lg border border-${config.color}-200 bg-${config.color}-50`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Wrench className={`w-5 h-5 text-${config.color}-600`} />
        <span className={`text-sm font-semibold text-${config.color}-800`}>
          Tool: {toolName}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs text-${config.color}-600`}>
            {config.label}
          </span>
          <Icon
            className={`w-4 h-4 text-${config.color}-600 ${
              state === "executing" || state === "streaming"
                ? "animate-spin"
                : ""
            }`}
          />
        </div>
      </div>
      {args && Object.keys(args).length > 0 && (
        <pre className="text-xs bg-white rounded p-2 mt-2 overflow-x-auto">
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
    </motion.div>
  );
};

const ToolResultCard: React.FC<{
  toolName: string;
  result: any;
  error?: string;
}> = ({ toolName, result, error }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={fadeInUp}
    className={`my-3 p-4 rounded-lg border ${
      error ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
    }`}
  >
    <div className="flex items-center gap-2 mb-2">
      {error ? (
        <XCircle className="w-5 h-5 text-red-600" />
      ) : (
        <CheckCircle className="w-5 h-5 text-green-600" />
      )}
      <span
        className={`text-sm font-semibold ${
          error ? "text-red-800" : "text-green-800"
        }`}
      >
        Result: {toolName}
      </span>
    </div>
    {error ? (
      <p className="text-sm text-red-700">{error}</p>
    ) : (
      <pre className="text-xs bg-white rounded p-2 mt-2 overflow-x-auto">
        {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
      </pre>
    )}
  </motion.div>
);

const WorkflowStepCard: React.FC<{
  title: string;
  description?: string;
  status: string;
  progress?: number;
}> = ({ title, description, status, progress }) => {
  const statusConfig = {
    pending: { icon: Clock, color: "gray", label: "Pending" },
    running: { icon: Loader2, color: "blue", label: "Running" },
    completed: { icon: CheckCircle, color: "green", label: "Completed" },
    error: { icon: XCircle, color: "red", label: "Error" },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeInUp}
      className={`my-3 p-4 rounded-lg border border-${config.color}-200 bg-${config.color}-50`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon
          className={`w-5 h-5 text-${config.color}-600 ${
            status === "running" ? "animate-spin" : ""
          }`}
        />
        <span className={`text-sm font-semibold text-${config.color}-800`}>
          {title}
        </span>
        <span className={`ml-auto text-xs text-${config.color}-600`}>
          {config.label}
        </span>
      </div>
      {description && (
        <p className={`text-sm text-${config.color}-700 mb-2`}>{description}</p>
      )}
      {progress !== undefined && (
        <div className="w-full bg-white rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-full bg-${config.color}-600`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </motion.div>
  );
};

const FileCard: React.FC<{
  file: { filename?: string; url: string; mediaType: string };
}> = ({ file }) => (
  <motion.a
    href={file.url}
    target="_blank"
    rel="noreferrer"
    initial="initial"
    animate="animate"
    variants={fadeInUp}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100 transition"
  >
    <FileText className="w-4 h-4 text-gray-600" />
    <span className="text-sm text-gray-800">{file.filename || "File"}</span>
  </motion.a>
);

const SourceCard: React.FC<{ url: string; title?: string }> = ({
  url,
  title,
}) => (
  <motion.a
    href={url}
    target="_blank"
    rel="noreferrer"
    initial="initial"
    animate="animate"
    variants={fadeInUp}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-green-50 hover:bg-green-100 transition"
  >
    <Link className="w-4 h-4 text-green-700" />
    <span className="text-sm text-green-800">{title || url}</span>
  </motion.a>
);