import { authClient } from "@/lib/auth-client";
import { motion } from "framer-motion";
import { memo } from "react";

export const Greeting = memo(function Greeting() {
  const { data: session } = authClient.useSession();
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-2 pt-16 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        Hello {session?.user?.name || "there"}!
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-zinc-500 md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        How can I help you today?
      </motion.div>
    </div>
  );
});
