import { MainChat } from "@/components/MainChat";
import { memo } from "react";
import AuthProvider from "@/components/AuthProvider";

function DashboardPage() {
  return (
    <>
      <div>
        <AuthProvider>
          <MainChat />
        </AuthProvider>
      </div>
    </>
  );
}

export default memo(DashboardPage);
