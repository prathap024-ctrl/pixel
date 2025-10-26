import { MainChat } from "@/components/MainChat";
import { memo } from "react";

function DashboardPage() {
  return (
    <>
      <div>
        <MainChat />
      </div>
    </>
  );
}

export default memo(DashboardPage);
