"use client";

import { cn } from "@/lib/utils";
import type { Role } from "@/lib/api/types";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navForRole, isNavActive, type NavEntry } from "./hrms-nav-config";
import Image from "next/image";

function NavRows({
  entries,
  pathname,
  collapsed,
  onNavigate,
}: {
  entries: NavEntry[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {entries.map((entry, idx) => {
        if ("href" in entry) {
          const active = isNavActive(pathname, entry.href);
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                )}
              />
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
                )}
              >
                {entry.label}
              </span>
            </Link>
          );
        }

        const Icon = entry.icon;
        const anySubActive = entry.items.some((sub) => isNavActive(pathname, sub.href));
        const defaultHref = entry.items[0]?.href ?? "#";

        if (collapsed) {
          return (
            <Link
              key={`${entry.label}-${idx}`}
              href={defaultHref}
              onClick={onNavigate}
              title={entry.label}
              className={cn(
                "group relative flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                anySubActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300",
                  anySubActive ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  anySubActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                )}
              />
            </Link>
          );
        }

        return (
          <div key={`${entry.label}-${idx}`} className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span>{entry.label}</span>
            </div>
            <div className="ml-3 space-y-0.5 border-l border-sidebar-border pl-3">
              {entry.items.map((sub) => {
                const active = isNavActive(pathname, sub.href);
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-md py-2 pl-3 pr-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                    )}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function HrmsSidebar({
  role,
  collapsed,
  onCollapsedChange,
  offboardingRestricted,
}: {
  role: Role;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  offboardingRestricted?: boolean;
}) {
  const pathname = usePathname();
  const entries = navForRole(role, { offboardingRestricted, currentPath: pathname });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-out md:flex",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          {/* <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span
            className={cn(
              "whitespace-nowrap text-lg font-semibold text-sidebar-foreground transition-all duration-300",
              collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
            )}
          >
            CloserHolic
          </span> */}
          <Image
            src="/logo/logo-dark.svg"
            alt="CloserHolic"
            width={32}
            height={32}
            loading="eager"
            className="w-full max-w-48 object-contain"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <NavRows entries={entries} pathname={pathname} collapsed={collapsed} />
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export function HrmsMobileNav({
  role,
  pathname,
  onNavigate,
  offboardingRestricted,
}: {
  role: Role;
  pathname: string;
  onNavigate?: () => void;
  offboardingRestricted?: boolean;
}) {
  const entries = navForRole(role, { offboardingRestricted, currentPath: pathname });
  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-4 flex items-center gap-3 border-b border-sidebar-border pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">CloserHolic</span>
      </div>
      <NavRows entries={entries} pathname={pathname} collapsed={false} onNavigate={onNavigate} />
    </nav>
  );
}
