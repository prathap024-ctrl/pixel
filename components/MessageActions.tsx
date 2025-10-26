// components/MessageActions.tsx
import React from "react";
import { motion } from "framer-motion";
import {
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

interface MessageActionsProps {
  messageId: string;
  content: string;
  role: "user" | "assistant" | "system";
  isLastAssistant?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onFeedback?: (type: "positive" | "negative") => void;
  className?: string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  content,
  role,
  isLastAssistant = false,
  onCopy,
  onRegenerate,
  onDelete,
  onFeedback,
  className,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [feedback, setFeedback] = React.useState<
    "positive" | "negative" | null
  >(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedback(type);
    onFeedback?.(type);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
        className
      )}
    >
      {/* Copy Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleCopy}
        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        title="Copy message"
      >
        {copied ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-green-600"
          >
            ✓
          </motion.div>
        ) : (
          <Copy className="w-4 h-4 text-gray-600" />
        )}
      </motion.button>

      {/* Regenerate Button (only for last assistant message) */}
      {role === "assistant" && isLastAssistant && onRegenerate && (
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={onRegenerate}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          title="Regenerate response"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </motion.button>
      )}

      {/* Feedback Buttons (only for assistant) */}
      {role === "assistant" && (
        <>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleFeedback("positive")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              feedback === "positive"
                ? "bg-green-100 text-green-600"
                : "hover:bg-gray-100 text-gray-600"
            )}
            title="Good response"
          >
            <ThumbsUp className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleFeedback("negative")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              feedback === "negative"
                ? "bg-red-100 text-red-600"
                : "hover:bg-gray-100 text-gray-600"
            )}
            title="Bad response"
          >
            <ThumbsDown className="w-4 h-4" />
          </motion.button>
        </>
      )}

      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            Copy to clipboard
          </DropdownMenuItem>

          {role === "assistant" && isLastAssistant && onRegenerate && (
            <DropdownMenuItem onClick={onRegenerate}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate response
            </DropdownMenuItem>
          )}

          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete message
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Simplified version for inline use
export const QuickActions: React.FC<{
  onCopy: () => void;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}> = ({ onCopy, onRegenerate, showRegenerate = false }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={handleCopy}
        className="text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
      >
        {copied ? (
          <>
            <span className="text-green-600">✓</span>
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </>
        )}
      </button>

      {showRegenerate && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Regenerate</span>
        </button>
      )}
    </div>
  );
};
