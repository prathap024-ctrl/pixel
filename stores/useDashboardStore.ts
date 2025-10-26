import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BookOpen, Settings2, Sparkles, Timer } from "lucide-react";
import {
  NavStore,
  SecondaryNavStore,
  SidebarState,
} from "@/types/dashboardStore";

export const useNavStore = create<NavStore>()(
  persist(
    (set) => ({
      navMain: [
        {
          title: "New Chat",
          url: "/chat",
          icon: Sparkles,
        },
        {
          title: "Scheduled Task",
          url: "/task",
          icon: Timer,
        },
      ],
      setNavMain: (items) => set({ navMain: items }),
    }),
    {
      name: "nav-store",
    }
  )
);

export const useSecondaryNavStore = create<SecondaryNavStore>()(
  persist(
    (set) => ({
      navSecondary: [
        {
          title: "Support",
          url: "/support",
          icon: BookOpen,
        },
        {
          title: "Settings",
          url: "/settings",
          icon: Settings2,
        },
      ],
      setNavSecondary: (items) => set({ navSecondary: items }),
    }),
    {
      name: "secondary-nav-store",
    }
  )
);

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: false,
      setOpen: (value) => set({ isOpen: value }),
      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    { name: "dashboard-sidebar" }
  )
);
