"use client";

import * as React from "react";
import NavMain from "@/components/nav-main";
import NavHistory from "@/components/nav-history";
import NavSecondary from "@/components/nav-secondary";
import NavUser from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { ThemedLogo } from "@/lib/assets";
import SidebarTigger from "./SidebarTigger";
import { ModeToggle } from "./ui/mode-toggle";
import { useSidebarStore } from "@/stores/useDashboardStore";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isOpen } = useSidebarStore();
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className={`w-full flex items-center justify-evenly pt-2 ${isOpen ? "gap-2" : "gap-0"}`}>
              <SidebarMenuButton size="default" asChild>
                <Link href="/">
                  <div className="text-sidebar-primary-foreground flex aspect-square size-4 items-center justify-center rounded-full">
                    <ThemedLogo className="h-4 w-4" />
                  </div>
                  <div className="text-left text-sm leading-tight">
                    <span className="truncate font-medium">PixelPilot</span>
                  </div> 
                </Link>
              </SidebarMenuButton>
              <div>{isOpen ? <ModeToggle /> : null}</div>
              <div className="md:hidden">
                <SidebarTigger />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <NavHistory />
        <NavSecondary className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
