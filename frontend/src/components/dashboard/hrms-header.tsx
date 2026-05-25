"use client";

import { cn } from "@/lib/utils";
import type { User } from "@/lib/api/types";
import { Bell, Calendar, Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { HrmsMobileNav } from "./hrms-sidebar";
import { ThemeToggle } from "./theme-toggle";
import { isNavActive, navForRole } from "./hrms-nav-config";
import type { Role } from "@/lib/api/types";

function titleForPath(pathname: string, role: Role, offboardingRestricted?: boolean): string {
  const entries = navForRole(role, { offboardingRestricted });
  for (const entry of entries) {
    if ("href" in entry && isNavActive(pathname, entry.href)) {
      return entry.label;
    }
    if ("items" in entry) {
      for (const sub of entry.items) {
        if (isNavActive(pathname, sub.href)) {
          return sub.label;
        }
      }
    }
  }
  return role === "ADMIN" ? "Admin" : "Portal";
}

export function HrmsHeader({
  role,
  user,
  offboardingRestricted,
}: {
  role: Role;
  user?: User;
  offboardingRestricted?: boolean;
}) {
  const pathname = usePathname();
  const [searchFocused, setSearchFocused] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const title = titleForPath(pathname, role, offboardingRestricted);
  const sidebarUser = {
    name: user?.full_name ?? "Team Member",
    email: user?.email ?? "",
    avatar: user?.avatar_url ?? "/images/user-default.avif",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-6">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg md:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SheetContent side="left" className="w-[min(100%,280px)] border-sidebar-border bg-sidebar p-0">
            <HrmsMobileNav
              role={role}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              offboardingRestricted={offboardingRestricted}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground md:text-xl">{title}</h1>
          <div className="mt-0.5 hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>HR Management System</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div
          className={cn(
            "relative hidden items-center transition-all duration-300 sm:flex",
            searchFocused ? "w-64" : "w-48"
          )}
        >
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            aria-label="Search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="h-9 w-full rounded-lg border border-border bg-secondary py-2 pl-9 pr-4 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <ThemeToggle />

        <button
          type="button"
          className="relative hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground sm:flex"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-accent" />
        </button>

        <div className="shrink-0">
          <NavUser user={sidebarUser} variant="header" />
        </div>
      </div>
    </header>
  );
}
