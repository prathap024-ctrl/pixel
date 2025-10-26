"use client";

import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { memo } from "react";
import { useNavStore } from "@/stores/useDashboardStore";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

function NavMain() {
  const { navMain } = useNavStore();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {navMain.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.title === "New Chat" ? (
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname.startsWith("/chat/")}
              >
                <button
                  onClick={() =>
                    router.push(`/chat/msg_${Date.now()}_${uuidv4()}`)
                  }
                  className="flex w-full items-center gap-2 text-left"
                >
                  <item.icon />
                  <span>{item.title}</span>
                </button>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.url}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export default memo(NavMain);
