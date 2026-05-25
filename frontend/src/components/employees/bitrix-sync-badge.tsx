"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCcwIcon } from "lucide-react";

function formatTs(ts?: string | null) {
  if (!ts) return "Never synced";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Unknown sync time";
  return `Last synced ${d.toLocaleString()}`;
}

export function BitrixSyncBadge({
  bitrixId,
  lastPulledAt,
  locked,
}: {
  bitrixId?: string | null;
  lastPulledAt?: string | null;
  locked?: boolean;
}) {
  if (!bitrixId) {
    return <Badge variant="outline">Manual</Badge>;
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <span>
          <Badge variant="secondary" className="gap-1">
            <RefreshCcwIcon className="size-3.5" />
            Bitrix24
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div>ID: {bitrixId}</div>
          <div>{formatTs(lastPulledAt)}</div>
          <div>{locked ? "Manual override enabled" : "Auto sync enabled"}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
