"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const leaveStatusClass: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100",
  REJECTED: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100",
  CANCELLED: "border-border bg-muted text-muted-foreground",
};

export function LeaveStatusBadge({ status, className }: { status: string; className?: string }) {
  const cls = leaveStatusClass[status] ?? leaveStatusClass.PENDING;
  return (
    <Badge variant="outline" className={cn(cls, className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const leaveTypeClass: Record<string, string> = {
  ANNUAL: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/50 dark:text-sky-100",
  SICK: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-100",
  EMERGENCY:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-50",
  UNPAID:
    "border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-100",
  MATERNITY:
    "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/50 dark:text-violet-100",
  PATERNITY:
    "border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/50 dark:text-indigo-100",
};

export function LeaveTypeBadge({ type, className }: { type: string; className?: string }) {
  const cls = leaveTypeClass[type] ?? leaveTypeClass.ANNUAL;
  return (
    <Badge variant="outline" className={cn(cls, className, "font-medium capitalize")}>
      {type.toLowerCase().replace(/_/g, " ")}
    </Badge>
  );
}
