"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeaveRequestForm } from "@/components/forms/leave-request-form";
import { useCancelLeaveMutation, useMyLeaveBalanceQuery, useMyLeavesQuery } from "@/lib/query/hooks";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { LeaveStatusBadge, LeaveTypeBadge } from "@/components/leaves/leave-badges";
import { cn } from "@/lib/utils";
import { CalendarClockIcon } from "lucide-react";

const portalTypes = ["ANNUAL", "SICK", "EMERGENCY", "UNPAID"] as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function MyLeavesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const leaves = useMyLeavesQuery({ page: 1, limit: 100 });
  const balance = useMyLeaveBalanceQuery();
  const cancelMut = useCancelLeaveMutation();

  if (leaves.isLoading || balance.isLoading) return <PageSkeleton />;

  const rows = leaves.data?.items ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My leave</h1>
          <p className="text-sm text-muted-foreground">Balances, requests, and new submissions.</p>
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          Request leave
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {portalTypes.map((t) => {
          const e = balance.data?.[t];
          const lim = e?.limitDays;
          const rem = e?.remainingDays;
          const used = e?.usedApprovedDays ?? 0;
          const pending = e?.pendingDays ?? 0;
          const warn = lim != null && rem != null && rem <= 0;

          return (
            <Card
              key={t}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-none transition-colors",
                warn && "border-destructive/50 bg-destructive/5 dark:bg-destructive/10",
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/6 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CalendarClockIcon
                className={cn(
                  "pointer-events-none absolute -top-4 -right-4 size-22 text-primary/12 transition-transform duration-300 group-hover:scale-105",
                  warn && "text-destructive/20",
                )}
              />

              <CardHeader className="relative pb-1.5">
                <CardTitle className="pr-10 text-sm font-semibold capitalize sm:text-base">{t.toLowerCase().replace(/_/g, " ")}</CardTitle>
                <CardDescription>
                  {e?.isCustomLimit ? (
                    <span className="text-amber-700 dark:text-amber-400">Custom limit</span>
                  ) : (
                    "Standard policy"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium tabular-nums">{used}d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="tabular-nums">{pending}d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Limit</span>
                  <span className="tabular-nums">{lim == null ? "—" : `${lim}d`}</span>
                </div>
                {lim != null && rem != null ? (
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className={cn("font-medium tabular-nums", warn && "text-destructive")}>{rem}d</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full bg-primary", warn && "bg-destructive")}
                        style={{ width: `${Math.min(100, Math.round((rem / lim) * 100))}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My requests</CardTitle>
          <CardDescription>All leave you have submitted.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Excess</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>
                    <LeaveTypeBadge type={leave.type} />
                  </TableCell>
                  <TableCell>{formatDate(leave.start_date)}</TableCell>
                  <TableCell>{formatDate(leave.end_date)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {leave.working_day_count ?? leave.day_count ?? "—"}
                  </TableCell>
                  <TableCell>
                    <LeaveStatusBadge status={leave.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{leave.excess_days ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(leave.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {leave.status === "PENDING" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={cancelMut.isPending}
                        onClick={async () => {
                          try {
                            await cancelMut.mutateAsync(leave.id);
                            await leaves.refetch();
                            toast.success("Request cancelled");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed");
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-8 text-center text-muted-foreground">
                    No leave requests yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
          </DialogHeader>
          <LeaveRequestForm
            onSuccess={() => {
              setDialogOpen(false);
              void leaves.refetch();
              void balance.refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
