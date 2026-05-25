"use client";

import { Badge } from "@/components/ui/badge";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadge = cva("border-transparent", {
  variants: {
    status: {
      ACTIVE: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300",
      ONBOARDING: "bg-amber-600/15 text-amber-700 dark:text-amber-300",
      CANDIDATE: "bg-blue-600/15 text-blue-700 dark:text-blue-300",
      TERMINATING: "bg-orange-600/15 text-orange-700 dark:text-orange-300",
      TERMINATED: "bg-red-600/15 text-red-700 dark:text-red-300",
      ON_LEAVE: "bg-sky-600/15 text-sky-700 dark:text-sky-300",
    },
  },
  defaultVariants: {
    status: "ACTIVE",
  },
});

export function EmployeeStatusBadge({
  status,
}: {
  status: "ACTIVE" | "ONBOARDING" | "CANDIDATE" | "TERMINATING" | "TERMINATED" | "ON_LEAVE";
}) {
  const label =
    status === "ONBOARDING"
      ? "Probation"
      : status === "ON_LEAVE"
        ? "On Leave"
        : status === "TERMINATING"
          ? "Terminating"
        : status.charAt(0) + status.slice(1).toLowerCase();
  return <Badge className={cn(statusBadge({ status }))}>{label}</Badge>;
}
