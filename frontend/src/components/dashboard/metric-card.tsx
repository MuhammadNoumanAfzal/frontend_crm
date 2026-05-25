"use client";

import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  footer?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  delay = 0,
  footer,
}: MetricCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/95 p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 hover:border-accent/60"
      style={{ animationDelay: `${delay * 100}ms`, animationFillMode: "both" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/6 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <Icon className="pointer-events-none absolute -bottom-3 -right-3 size-18 text-primary/12 transition-transform duration-300 group-hover:scale-105 sm:-bottom-4 sm:-right-4 sm:size-22" />

      <div className="relative">
        <div className="mb-2 flex items-start justify-between">
          <span className="pr-8 text-xs font-semibold tracking-wide text-muted-foreground sm:text-sm">{title}</span>
        </div>

        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <span className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-[1.7rem]">{value}</span>
          {change ? (
            <div
              className={cn(
                "mb-0.5 flex items-center gap-1 text-xs font-medium sm:text-sm",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {changeType === "positive" ? <TrendingUp className="h-3.5 w-3.5" /> : null}
              {changeType === "negative" ? <TrendingDown className="h-3.5 w-3.5" /> : null}
              <span>{change}</span>
            </div>
          ) : null}
        </div>
        {footer ? <div className="mt-1.5 text-xs text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
