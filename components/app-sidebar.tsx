"use client";

import * as React from "react";
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
import { Sparkles, TrashIcon } from "lucide-react";
import { useSWRConfig } from "swr";
import { useRouter } from "next/navigation";
import { unstable_serialize } from "swr/infinite";
import { toast } from "sonner";
import {
  SidebarHistory,
  getChatHistoryPaginationKey,
} from "@/components/sidebar-history";
import { User } from "better-auth";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export function AppSidebar({ user, ...props }: { user: User | undefined }) {
  const { isOpen } = useSidebarStore();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = React.useState(false);

  const handleDeleteAll = () => {
    const deletePromise = fetch("/api/history", {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: () => {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        router.push("/");
        setShowDeleteAllDialog(false);
        return "All chats deleted successfully";
      },
      error: "Failed to delete all chats",
    });
  };
  return (
    <>
      <Sidebar variant="floating" collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div
                className={`w-full flex items-center justify-evenly ${
                  isOpen ? "gap-2" : "gap-0"
                }`}
              >
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
                <div>
                  {isOpen ? (
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ModeToggle />
                        </TooltipTrigger>
                        <TooltipContent align="end" className="hidden md:block">
                          Toggle Theme
                        </TooltipContent>
                      </Tooltip>
                      {user && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              className="h-8 p-1 md:h-fit md:p-2"
                              onClick={() => {
                                setShowDeleteAllDialog(true);
                                router.refresh();
                              }}
                              type="button"
                              variant="ghost"
                            >
                              <TrashIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            align="end"
                            className="hidden md:block"
                          >
                            Delete All Chats
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="md:hidden">
                  <SidebarTigger />
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <div className="flex flex-col items-center px-2 mt-2">
            <SidebarMenuButton
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
              asChild
            >
              <Link href="/">
                <Sparkles />
                <span>New Chat</span>
              </Link>
            </SidebarMenuButton>
          </div>
          <SidebarHistory user={user} />
          <NavSecondary className="mt-auto" />
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
