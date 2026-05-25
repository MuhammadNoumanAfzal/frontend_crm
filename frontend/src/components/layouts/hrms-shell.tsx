"use client";

import { HrmsHeader } from "@/components/dashboard/hrms-header";
import { HrmsSidebar } from "@/components/dashboard/hrms-sidebar";
import type { Role, User } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import * as React from "react";

const COLLAPSED_KEY = "hrms-sidebar-collapsed";

export function HrmsShell({
  role,
  user,
  offboardingRestricted,
  children,
}: {
  role: Role;
  user?: User;
  offboardingRestricted?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(COLLAPSED_KEY);
      if (v === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const onCollapsedChange = React.useCallback((v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const effectiveCollapsed = hydrated && collapsed;

  return (
    <div className="flex min-h-screen bg-background">
      <HrmsSidebar
        role={role}
        collapsed={effectiveCollapsed}
        onCollapsedChange={onCollapsedChange}
        offboardingRestricted={offboardingRestricted}
      />
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-out",
          effectiveCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"
        )}
      >
        <HrmsHeader role={role} user={user} offboardingRestricted={offboardingRestricted} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          <div className="min-w-0 duration-500 animate-in fade-in slide-in-from-bottom-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
