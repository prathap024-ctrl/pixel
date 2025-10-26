"use client";

import { ArrowLeft } from "lucide-react";
import React, { memo } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/useDashboardStore";

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const toggleSidebar = useSidebarStore((state) => state.toggleSidebar);
  const isOpen = useSidebarStore((state) => state.isOpen);

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      {isOpen ? (
        <ArrowLeft className="size-5" />
      ) : (
        <ArrowLeft className="rotate-180 size-5" />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export default memo(SidebarTrigger);
