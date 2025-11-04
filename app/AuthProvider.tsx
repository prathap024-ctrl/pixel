"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Spinner } from "../components/ui/spinner";
import { useEffect } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div>
          <Spinner className="size-20 text-sidebar-accent" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
