import { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type NavStore = {
  navMain: NavItem[];
  setNavMain: (items: NavItem[]) => void;
};


export type SecondaryNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type SecondaryNavStore = {
  navSecondary: SecondaryNavItem[];
  setNavSecondary: (items: SecondaryNavItem[]) => void;
};


export interface SidebarState {
  isOpen: boolean;
  setOpen: (value: boolean) => void;
  toggleSidebar: () => void;
}
