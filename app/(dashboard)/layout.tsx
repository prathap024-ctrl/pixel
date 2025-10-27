"use client";

import { AppSidebar } from "@/components/app-sidebar";
import SidebarTrigger from "@/components/SidebarTigger";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useSidebarStore } from "@/stores/useDashboardStore";
import { memo } from "react";

function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isOpen, setOpen } = useSidebarStore();
  return (
    <>
        <SidebarProvider
          open={isOpen}
          onOpenChange={setOpen}
          openMobile={isOpen}
          setOpenMobile={setOpen}
        >
          <AppSidebar />
          <SidebarInset className="dark:bg-black">
            <div className="absolute w-full flex items-center py-4 px-4">
              <div className="z-50 bg-white dark:bg-black rounded-full shadow-md">
                <SidebarTrigger />
              </div>
            </div>
            <div>{children}</div>
          </SidebarInset>
        </SidebarProvider>
    </>
  );
}

export default memo(DashboardLayout);
