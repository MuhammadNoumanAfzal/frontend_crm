"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardTone = "default" | "danger" | "warning" | "success";

type StatCardProps = {
  title: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: StatCardTone;
  className?: string;
  valueClassName?: string;
};

const toneClassMap: Record<StatCardTone, string> = {
  default: "text-primary/12",
  danger: "text-destructive/18",
  warning: "text-amber-500/18",
  success: "text-emerald-500/18",
};

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <Card className={cn("group relative overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-none gap-1 py-2", className)}>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/6 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {Icon ? (
        <Icon
          className={cn(
            "pointer-events-none absolute -bottom-3 -right-3 size-18 transition-transform duration-300 group-hover:scale-105 sm:-bottom-4 sm:-right-4 sm:size-22",
            toneClassMap[tone],
          )}
        />
      ) : null}

      <CardHeader className="space-y-1 p-4 pb-1.5 sm:p-4 sm:pb-1">
        <CardTitle className="pr-9 text-xs font-semibold tracking-wide text-muted-foreground sm:text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-1.5 sm:p-4 sm:pt-1">
        <div className={cn("text-xl font-semibold tracking-tight tabular-nums sm:text-2xl", valueClassName)}>{value}</div>
        {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}