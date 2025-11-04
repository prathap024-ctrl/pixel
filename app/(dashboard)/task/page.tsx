import React from "react";
import { ScheduledTaskPage } from "@/components/task";

const Page = () => {
  return (
    <div className="px-4 py-4">
      <div className="max-w-4xl mx-auto overflow-y-auto">
        <div>
          <h2 className="text-2xl font-bold">Scheduled Tasks</h2>
        </div>
        <ScheduledTaskPage />
      </div>
    </div>
  );
};

export default Page;
