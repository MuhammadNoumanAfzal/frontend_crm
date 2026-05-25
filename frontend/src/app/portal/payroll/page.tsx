"use client";

import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PayrollLine, PayrollRun, PayrollRunStatus } from "@/lib/api/types";
import { useMyPayrollSummaryQuery, useMyPayslipDownloadMutation } from "@/lib/query/hooks";
import { CalendarClockIcon, DownloadIcon, LandmarkIcon, ReceiptTextIcon } from "lucide-react";

function parseDecimal(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: string | number | null | undefined) {
  return parseDecimal(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function monthLabel(month: number, year: number) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

function runStatusBadge(status: PayrollRunStatus | null | undefined) {
  if (status === "PROCESSED") return <Badge>Processed</Badge>;
  if (status === "DRAFT") return <Badge variant="secondary">Draft</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}

function lineStatusBadge(status: PayrollLine["status"]) {
  if (status === "PAID") return <Badge>Paid</Badge>;
  if (status === "APPROVED") return <Badge variant="secondary">Approved</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function lineTotalDeductions(line: PayrollLine | null | undefined) {
  if (!line) return 0;
  return (
    parseDecimal(line.unpaid_leave_deduction) +
    parseDecimal(line.paid_leave_excess_deduction) +
    parseDecimal(line.advance_deduction) +
    parseDecimal(line.manual_deduction)
  );
}

function lineTotalEarnings(line: PayrollLine | null | undefined) {
  if (!line) return 0;
  return (
    parseDecimal(line.base_salary) +
    parseDecimal(line.housing_allowance) +
    parseDecimal(line.transport_allowance) +
    parseDecimal(line.other_benefits) +
    parseDecimal(line.manual_bonus)
  );
}

function latestLine(run: PayrollRun | null | undefined) {
  return run?.lines?.[0] ?? null;
}

export default function PortalPayrollPage() {
  const summaryQuery = useMyPayrollSummaryQuery();
  const payslipMutation = useMyPayslipDownloadMutation();

  if (summaryQuery.isLoading) return <PageSkeleton />;

  const currentRun = summaryQuery.data?.current ?? null;
  const history = summaryQuery.data?.history ?? [];
  const currentLine = latestLine(currentRun);

  const ytd = history
    .filter((run) => run.year === new Date().getUTCFullYear())
    .reduce((sum, run) => sum + parseDecimal(latestLine(run)?.net_pay), 0);

  const processedCount = history.filter((run) => run.status === "PROCESSED").length;
  const latestPaidAt = currentRun?.finalized_at ? format(new Date(currentRun.finalized_at), "PPP") : "Not finalized";

  const handleDownload = async (runId: string) => {
    try {
      await payslipMutation.mutateAsync(runId);
      toast.success("Payslip downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to download payslip");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">My Payroll</h1>
        <p className="text-sm text-muted-foreground">
          View your latest payroll calculations, history, and download your payslips.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Current Net Salary"
          value={`AED ${money(currentLine?.net_pay ?? 0)}`}
          icon={LandmarkIcon}
        />
        <StatCard
          title="Current Deductions"
          value={`AED ${money(lineTotalDeductions(currentLine))}`}
          icon={ReceiptTextIcon}
          tone="warning"
        />
        <StatCard
          title="YTD Net Salary"
          value={`AED ${money(ytd)}`}
          icon={CalendarClockIcon}
        />
        <StatCard
          title="Payslips Ready"
          value={processedCount}
          hint={`Latest finalization: ${latestPaidAt}`}
          icon={DownloadIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Details</CardTitle>
          <CardDescription>Track your earnings, deductions, and payroll status per run.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="current">
            <TabsList variant="line" className="mb-4">
              <TabsTrigger value="current">Current run</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-4">
              {!currentRun || !currentLine ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No payroll run is available yet.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">Period: {monthLabel(currentRun.month, currentRun.year)}</p>
                      <p className="text-xs text-muted-foreground">
                        {currentLine.employee?.employee_data?.designation ?? "Employee"}
                        {currentLine.employee?.employee_data?.department
                          ? ` | ${currentLine.employee.employee_data.department}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {runStatusBadge(currentRun.status)}
                      {lineStatusBadge(currentLine.status)}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDownload(currentRun.id)}
                        disabled={payslipMutation.isPending}
                      >
                        <DownloadIcon className="mr-2 size-4" />
                        Download payslip
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Earnings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Base salary</span><span>AED {money(currentLine.base_salary)}</span></div>
                        <div className="flex justify-between"><span>Housing allowance</span><span>AED {money(currentLine.housing_allowance)}</span></div>
                        <div className="flex justify-between"><span>Transport allowance</span><span>AED {money(currentLine.transport_allowance)}</span></div>
                        <div className="flex justify-between"><span>Other benefits</span><span>AED {money(currentLine.other_benefits)}</span></div>
                        <div className="flex justify-between"><span>Manual additions</span><span className="text-emerald-700">+ AED {money(currentLine.manual_bonus)}</span></div>
                        <Separator />
                        <div className="flex justify-between font-medium"><span>Total earnings</span><span>AED {money(lineTotalEarnings(currentLine))}</span></div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Deductions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Excess paid leave ({currentLine.paid_leave_excess_days ?? 0} day(s))</span>
                          <span className="text-red-700">- AED {money(currentLine.paid_leave_excess_deduction)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unpaid leave ({currentLine.unpaid_leave_days ?? 0} day(s))</span>
                          <span className="text-red-700">- AED {money(currentLine.unpaid_leave_deduction)}</span>
                        </div>
                        <div className="flex justify-between"><span>Advance recovery</span><span className="text-red-700">- AED {money(currentLine.advance_deduction)}</span></div>
                        <div className="flex justify-between"><span>Manual deductions</span><span className="text-red-700">- AED {money(currentLine.manual_deduction)}</span></div>
                        <Separator />
                        <div className="flex justify-between font-medium"><span>Total deductions</span><span>AED {money(lineTotalDeductions(currentLine))}</span></div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">Net salary</p>
                    <p className="text-2xl font-semibold">AED {money(currentLine.net_pay)}</p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-3">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Run status</TableHead>
                      <TableHead>Line status</TableHead>
                      <TableHead>Total deductions</TableHead>
                      <TableHead>Net salary</TableHead>
                      <TableHead>Finalized at</TableHead>
                      <TableHead className="text-right">Payslip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">
                          No payroll history yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((run) => {
                        const line = latestLine(run);
                        return (
                          <TableRow key={run.id}>
                            <TableCell className="font-medium">{monthLabel(run.month, run.year)}</TableCell>
                            <TableCell>{runStatusBadge(run.status)}</TableCell>
                            <TableCell>{lineStatusBadge(line?.status)}</TableCell>
                            <TableCell>AED {money(lineTotalDeductions(line))}</TableCell>
                            <TableCell>AED {money(line?.net_pay)}</TableCell>
                            <TableCell>{run.finalized_at ? format(new Date(run.finalized_at), "PPP") : "-"}</TableCell>
                            <TableCell>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleDownload(run.id)}
                                  disabled={payslipMutation.isPending}
                                >
                                  <DownloadIcon className="mr-2 size-4" />
                                  Download
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
