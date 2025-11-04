"use client";

import { AppSidebar } from "@/components/app-sidebar";
import AuthProvider from "@/app/AuthProvider";
import SidebarTrigger from "@/components/SidebarTigger";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/stores/useDashboardStore";
import { memo } from "react";
import { authClient } from "@/lib/auth-client";
import { DataStreamProvider } from "@/components/data-stream-provider";

function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isOpen, setOpen } = useSidebarStore();
  const { data: session } = authClient.useSession();

  return (
    <>
      <AuthProvider>
        <DataStreamProvider>
          <SidebarProvider
            open={isOpen}
            onOpenChange={setOpen}
            openMobile={isOpen}
            setOpenMobile={setOpen}
          >
            <AppSidebar user={session?.user} />
            <SidebarInset className="dark:bg-black">
              <div className="absolute w-full flex items-center justify-between md:py-4 py-2 px-4">
                <div className="z-50 bg-white dark:bg-black rounded-full shadow-md">
                  <SidebarTrigger />
                </div>
              </div>
              <div>{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </DataStreamProvider>
      </AuthProvider>
    </>
  );
}

export default memo(DashboardLayout);
