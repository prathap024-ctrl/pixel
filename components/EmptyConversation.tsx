import React, { memo } from "react";
import { ConversationEmptyState } from "./ai-elements/conversation";
import { authClient } from "@/lib/auth-client";
import { AnimatePresence, motion } from "framer-motion";

const EmptyConversation = () => {
  const { data: session } = authClient.useSession();
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ConversationEmptyState
            title={`Hey ${session?.user?.name || "there"}! 👋`}
            description="What’s on your mind today?"
            className="w-full max-w-2xl mx-auto text-center"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default memo(EmptyConversation);
