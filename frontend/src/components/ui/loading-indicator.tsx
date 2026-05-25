"use client";

import { Loader2Icon } from "lucide-react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";

type LoadingIndicatorProps = {
  className?: string;
  label?: string;
};

export function InlineLoadingIndicator({ className, label = "Loading..." }: LoadingIndicatorProps) {
  return (
    <div className={className ?? "inline-flex items-center gap-2 text-sm text-muted-foreground"}>
      <Loader2Icon className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function GlobalLoadingIndicator() {
  const fetchingCount = useIsFetching();
  const mutatingCount = useIsMutating();
  const isBusy = fetchingCount + mutatingCount > 0;

  return (
    <div
      aria-hidden={!isBusy}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[70] h-1 transition-opacity duration-200 ${
        isBusy ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-full w-full overflow-hidden bg-primary/20">
        <div className="h-full w-1/3 animate-[loading-slide_1.1s_ease-in-out_infinite] bg-primary" />
      </div>
    </div>
  );
}