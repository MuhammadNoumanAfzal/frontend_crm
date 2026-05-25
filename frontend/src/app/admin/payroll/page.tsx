"use client";

import { useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PayrollLine, PayrollRun, PayrollRunStatus } from "@/lib/api/types";
import {
  useAdvancesQuery,
  useCreateAdvanceMutation,
  useEmployeesQuery,
  usePayrollAdminPayslipDownloadMutation,
  usePayrollFinalizeMutation,
  usePayrollLineUpdateMutation,
  usePayrollRunDetailQuery,
  usePayrollRunQuery,
  usePayrollRunsHistoryQuery,
  usePayrollRunStatusMutation,
  usePayrollStatsQuery,
  usePayrollWpsExportMutation,
  useSettingsCompanyQuery,
  useUpdateAdvanceMutation,
} from "@/lib/query/hooks";
import {
  AlertTriangleIcon,
  DownloadIcon,
  FileDownIcon,
  LandmarkIcon,
  MoreHorizontalIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

type TabValue = "current" | "history" | "payslips" | "advances";

type LineFormState = {
  manual_bonus: string;
  manual_deduction: string;
  advance_deduction: string;
  notes: string;
  status: "DRAFT" | "APPROVED" | "PAID";
};

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

function statusBadge(status: PayrollRunStatus | "NOT_GENERATED" | null | undefined) {
  if (status === "PROCESSED") return <Badge>Processed</Badge>;
  if (status === "DRAFT") return <Badge variant="secondary">Draft</Badge>;
  return <Badge variant="outline">Not generated</Badge>;
}

function lineStatusBadge(status: PayrollLine["status"]) {
  if (status === "PAID") return <Badge>Paid</Badge>;
  if (status === "APPROVED") return <Badge variant="secondary">Approved</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function runStatusBadge(status: PayrollRunStatus | "NOT_GENERATED" | null | undefined, finalizedAt?: string | null) {
  if (finalizedAt) return <Badge>Finalized</Badge>;
  return statusBadge(status);
}

function ActionHint({ reason, children }: { reason?: string; children: ReactNode }) {
  if (!reason) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex cursor-not-allowed">{children}</span>} />
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

export default function PayrollPage() {
  const now = new Date();
  const defaultMonth = now.getUTCMonth() + 1;
  const defaultYear = now.getUTCFullYear();

  const [selectedMonthYear, setSelectedMonthYear] = useState(
    `${defaultYear}-${String(defaultMonth).padStart(2, "0")}`,
  );
  const [runMonth, setRunMonth] = useState<number | null>(defaultMonth);
  const [runYear, setRunYear] = useState<number | null>(defaultYear);

  const [activeTab, setActiveTab] = useState<TabValue>("current");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [lineForm, setLineForm] = useState<LineFormState>({
    manual_bonus: "0",
    manual_deduction: "0",
    advance_deduction: "0",
    notes: "",
    status: "DRAFT",
  });

  const [newAdvanceOpen, setNewAdvanceOpen] = useState(false);
  const [newAdvanceEmployeeId, setNewAdvanceEmployeeId] = useState("");
  const [newAdvanceAmount, setNewAdvanceAmount] = useState("");
  const [newAdvanceMonthlyDeduction, setNewAdvanceMonthlyDeduction] = useState("");
  const [newAdvanceReason, setNewAdvanceReason] = useState("");

  const [advanceSearch, setAdvanceSearch] = useState("");
  const [advanceDraftMonthly, setAdvanceDraftMonthly] = useState<Record<string, string>>({});

  const generateRunQuery = usePayrollRunQuery(runMonth, runYear);
  const generatedRun = generateRunQuery.data as PayrollRun | undefined;
  const resolvedRunId = activeRunId ?? generatedRun?.id ?? null;
  const statsQuery = usePayrollStatsQuery({
    month: runMonth ?? undefined,
    year: runYear ?? undefined,
    runId: resolvedRunId,
  });
  const historyQuery = usePayrollRunsHistoryQuery({ page: 1, limit: 50, year: runYear ?? undefined });
  const runDetailQuery = usePayrollRunDetailQuery(resolvedRunId);

  const lineUpdateMutation = usePayrollLineUpdateMutation();
  const runStatusMutation = usePayrollRunStatusMutation();
  const finalizeMutation = usePayrollFinalizeMutation();
  const wpsExportMutation = usePayrollWpsExportMutation();
  const adminPayslipMutation = usePayrollAdminPayslipDownloadMutation();
  const companySettingsQuery = useSettingsCompanyQuery();

  const advancesQuery = useAdvancesQuery({ page: 1, limit: 200 });
  const employeesQuery = useEmployeesQuery({ page: 1, limit: 200, is_active: true });
  const createAdvanceMutation = useCreateAdvanceMutation();
  const updateAdvanceMutation = useUpdateAdvanceMutation();

  const currentRun = runDetailQuery.data ?? null;
  const selectedLine = useMemo(
    () => currentRun?.lines?.find((line) => line.id === selectedLineId) ?? null,
    [currentRun?.lines, selectedLineId],
  );

  const isRunFinalized = Boolean(currentRun?.finalized_at);
  const isRunProcessed = Boolean(currentRun) && !isRunFinalized && currentRun?.status === "PROCESSED";
  const canEditFinancials = Boolean(currentRun) && !isRunProcessed && !isRunFinalized;

  const employerIdMissing = !companySettingsQuery.isLoading && !(companySettingsQuery.data?.employer_id ?? "").trim();

  const wpsBlockedReason = !currentRun
    ? "Open a payroll run first."
    : companySettingsQuery.isLoading
      ? "Checking company settings..."
      : employerIdMissing
        ? "Employer ID is required in Global Settings before exporting WPS SIF."
        : undefined;

  const historyWpsBlockedReason = companySettingsQuery.isLoading
    ? "Checking company settings..."
    : employerIdMissing
      ? "Employer ID is required in Global Settings before exporting WPS SIF."
      : undefined;

  const setDraftBlockedReason = !currentRun
    ? "Open a payroll run first."
    : isRunFinalized
      ? "Finalized runs cannot be moved back to draft."
      : !isRunProcessed
        ? "Run is already in draft."
        : undefined;

  const setProcessedBlockedReason = !currentRun
    ? "Open a payroll run first."
    : isRunFinalized
      ? "Finalized runs are permanent and cannot be re-processed."
      : isRunProcessed
        ? "Run is already processed."
        : undefined;

  const finalizeBlockedReason = !currentRun
    ? "Open a payroll run first."
    : isRunFinalized
      ? "Run is already finalized."
      : !isRunProcessed
        ? "Mark run as Processed before finalizing payroll."
        : undefined;

  const saveLineBlockedReason = !selectedLine
    ? "Open a payroll line first."
    : !canEditFinancials
      ? isRunFinalized
        ? "Finalized payroll lines are locked."
        : "Processed runs allow only Mark Paid. Switch run to Draft for edits."
      : undefined;

  const approveLineBlockedReason = !selectedLine
    ? "Open a payroll line first."
    : !canEditFinancials
      ? isRunFinalized
        ? "Finalized payroll lines are locked."
        : "Processed runs allow only Mark Paid."
      : lineForm.status === "APPROVED"
        ? "Line is already approved."
        : undefined;

  const runDeductions = useMemo(() => {
    if (!currentRun) return 0;
    return currentRun.lines.reduce((sum, line) => {
      return (
        sum +
        parseDecimal(line.unpaid_leave_deduction) +
        parseDecimal(line.paid_leave_excess_deduction) +
        parseDecimal(line.advance_deduction) +
        parseDecimal(line.manual_deduction)
      );
    }, 0);
  }, [currentRun]);

  const filteredAdvances = useMemo(() => {
    const rows = advancesQuery.data?.items ?? [];
    const term = advanceSearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const name = row.employee?.full_name?.toLowerCase() ?? "";
      const reason = row.reason?.toLowerCase() ?? "";
      return name.includes(term) || reason.includes(term);
    });
  }, [advanceSearch, advancesQuery.data?.items]);

  const handleGenerateRun = () => {
    const [yearRaw, monthRaw] = selectedMonthYear.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      toast.error("Invalid month selection");
      return;
    }

    setRunYear(year);
    setRunMonth(month);
    setActiveRunId(null);
    setSelectedLineId(null);
    setDetailOpen(false);
    setActiveTab("current");
  };

  const openLineSheet = (lineId: string) => {
    const line = currentRun?.lines?.find((entry) => entry.id === lineId);
    if (line) {
      setLineForm({
        manual_bonus: line.manual_bonus ?? "0",
        manual_deduction: line.manual_deduction ?? "0",
        advance_deduction: line.advance_deduction ?? "0",
        notes: line.notes ?? "",
        status: line.status ?? "DRAFT",
      });
    }
    setSelectedLineId(lineId);
    setDetailOpen(true);
  };

  const handleSaveLine = async () => {
    if (!currentRun || !selectedLine) return;
    if (!canEditFinancials) {
      toast.error(isRunFinalized ? "Finalized payroll lines are locked" : "Processed runs allow only Mark Paid");
      return;
    }

    try {
      await lineUpdateMutation.mutateAsync({
        runId: currentRun.id,
        lineId: selectedLine.id,
        body: {
          manual_bonus: lineForm.manual_bonus,
          manual_deduction: lineForm.manual_deduction,
          advance_deduction: lineForm.advance_deduction,
          notes: lineForm.notes.trim() ? lineForm.notes : null,
          status: lineForm.status,
        },
      });
      toast.success("Payroll line updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update payroll line");
    }
  };

  const handleApproveLine = async () => {
    if (!currentRun || !selectedLine) return;
    if (!canEditFinancials) {
      toast.error(isRunFinalized ? "Finalized payroll lines are locked" : "Processed runs allow only Mark Paid");
      return;
    }
    try {
      await lineUpdateMutation.mutateAsync({
        runId: currentRun.id,
        lineId: selectedLine.id,
        body: {
          status: "APPROVED",
        },
      });
      setLineForm((prev) => ({ ...prev, status: "APPROVED" }));
      toast.success("Line approved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to approve line");
    }
  };

  const handleMarkLinePaid = async (lineId: string) => {
    if (!currentRun) return;
    if (isRunFinalized) {
      toast.error("Finalized payroll lines are locked");
      return;
    }
    try {
      await lineUpdateMutation.mutateAsync({
        runId: currentRun.id,
        lineId,
        body: { status: "PAID" },
      });
      toast.success("Line marked as paid");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to mark as paid");
    }
  };

  const handleApproveLineFromTable = async (lineId: string) => {
    if (!currentRun) return;
    if (!canEditFinancials) {
      toast.error(isRunFinalized ? "Finalized payroll lines are locked" : "Processed runs allow only Mark Paid");
      return;
    }
    try {
      await lineUpdateMutation.mutateAsync({
        runId: currentRun.id,
        lineId,
        body: { status: "APPROVED" },
      });
      toast.success("Line approved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to approve line");
    }
  };

  const handleRunStatus = async (status: PayrollRunStatus) => {
    if (!currentRun) return;
    if (isRunFinalized) {
      toast.error("Finalized payroll run cannot change status");
      return;
    }
    if (status === "DRAFT" && !isRunProcessed) {
      toast.error("Run is already in draft");
      return;
    }
    if (status === "PROCESSED" && isRunProcessed) {
      toast.error("Run is already processed");
      return;
    }
    try {
      await runStatusMutation.mutateAsync({ runId: currentRun.id, status });
      toast.success(status === "PROCESSED" ? "Run processed" : "Run moved to draft");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update run status");
    }
  };

  const handleFinalize = async () => {
    if (!currentRun) return;
    if (finalizeBlockedReason) {
      toast.error(finalizeBlockedReason);
      return;
    }
    try {
      await finalizeMutation.mutateAsync(currentRun.id);
      toast.success("Payroll finalized");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to finalize payroll");
    }
  };

  const handleExportWps = async () => {
    if (!currentRun) return;
    if (wpsBlockedReason) {
      toast.error(wpsBlockedReason);
      return;
    }
    try {
      await wpsExportMutation.mutateAsync(currentRun.id);
      toast.success("WPS SIF exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export WPS SIF");
    }
  };

  const handleGeneratePayslip = async (line: PayrollLine) => {
    if (!currentRun) return;
    try {
      await adminPayslipMutation.mutateAsync({ runId: currentRun.id, employeeId: line.employee_id });
      toast.success("Payslip generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate payslip");
    }
  };

  const handleCreateAdvance = async () => {
    if (!newAdvanceEmployeeId || !newAdvanceAmount.trim()) {
      toast.error("Employee and amount are required");
      return;
    }

    try {
      await createAdvanceMutation.mutateAsync({
        employee_id: newAdvanceEmployeeId,
        amount: newAdvanceAmount,
        reason: newAdvanceReason.trim() || undefined,
        monthly_deduction: newAdvanceMonthlyDeduction.trim() || undefined,
      });

      setNewAdvanceOpen(false);
      setNewAdvanceEmployeeId("");
      setNewAdvanceAmount("");
      setNewAdvanceMonthlyDeduction("");
      setNewAdvanceReason("");
      toast.success("Advance created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create advance");
    }
  };

  const handleSaveAdvanceSchedule = async (advanceId: string) => {
    const value = advanceDraftMonthly[advanceId];
    if (!value || !value.trim()) {
      toast.error("Monthly deduction is required");
      return;
    }

    try {
      await updateAdvanceMutation.mutateAsync({
        advanceId,
        body: { monthly_deduction: value },
      });
      toast.success("Advance schedule updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update schedule");
    }
  };

  const handleMarkAdvanceSettled = async (advanceId: string) => {
    try {
      await updateAdvanceMutation.mutateAsync({
        advanceId,
        body: { is_cleared: true },
      });
      toast.success("Advance marked as settled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to settle advance");
    }
  };

  if (generateRunQuery.isLoading && !currentRun) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            UAE payroll operations with WPS-ready exports, line approvals, and employee payslips.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="space-y-1">
            <Label htmlFor="payroll-month">Payroll month</Label>
            <Input id="payroll-month" type="month" value={selectedMonthYear} onChange={(event) => setSelectedMonthYear(event.target.value)} />
          </div>
          <ActionHint reason={wpsBlockedReason}>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportWps}
              disabled={Boolean(wpsBlockedReason) || wpsExportMutation.isPending}
            >
              <FileDownIcon className="mr-2 size-4" />
              Export WPS SIF
            </Button>
          </ActionHint>
          <Button type="button" onClick={handleGenerateRun} disabled={generateRunQuery.isFetching}>
            {generateRunQuery.isFetching ? "Generating..." : "Generate payroll"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Payroll"
          value={`AED ${money(statsQuery.data?.total_payroll ?? 0)}`}
          icon={LandmarkIcon}
        />
        <StatCard
          title="Employees On Payroll"
          value={statsQuery.data?.employee_count ?? 0}
          icon={UsersIcon}
        />
        <StatCard
          title="Total Deductions"
          value={`AED ${money(statsQuery.data?.total_deductions ?? 0)}`}
          icon={ReceiptTextIcon}
          tone="warning"
        />
        <StatCard
          title="Run Status"
          value={statusBadge(statsQuery.data?.run_status)}
          hint={runMonth && runYear ? monthLabel(runMonth, runYear) : "Select month"}
          icon={ShieldCheckIcon}
          valueClassName="text-base sm:text-lg"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Payroll Workspace</CardTitle>
            <p className="text-sm text-muted-foreground">Review and process payroll by run, payslip, and advance schedule.</p>
          </div>

          {currentRun ? (
            <div className="space-y-1">
              <div className="flex flex-wrap gap-2 justify-end">
                <ActionHint reason={setDraftBlockedReason}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRunStatus("DRAFT")}
                    disabled={Boolean(setDraftBlockedReason) || runStatusMutation.isPending}
                  >
                    Set Draft
                  </Button>
                </ActionHint>
                <ActionHint reason={setProcessedBlockedReason}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRunStatus("PROCESSED")}
                    disabled={Boolean(setProcessedBlockedReason) || runStatusMutation.isPending}
                  >
                    Mark Processed
                  </Button>
                </ActionHint>
                <ActionHint reason={finalizeBlockedReason}>
                  <Button type="button" onClick={handleFinalize} disabled={Boolean(finalizeBlockedReason) || finalizeMutation.isPending}>
                    Finalize Payroll
                  </Button>
                </ActionHint>
              </div>
              <p className="text-xs text-muted-foreground text-wrap">
                Processed temporarily locks financial edits and allows only Mark Paid updates. Finalize permanently closes the run and posts advance recoveries.
              </p>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
            <TabsList variant="line" className="mb-4">
              <TabsTrigger value="current">Current run</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="payslips">Payslips</TabsTrigger>
              <TabsTrigger value="advances">Advances</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-3">
              {!currentRun ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Generate payroll for the selected month to start processing.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Run: {monthLabel(currentRun.month, currentRun.year)}</p>
                      <p className="text-xs text-muted-foreground">Total deductions: AED {money(runDeductions)}</p>
                    </div>
                    {runStatusBadge(currentRun.status ?? (currentRun.is_locked ? "PROCESSED" : "DRAFT"), currentRun.finalized_at)}
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Base salary (AED)</TableHead>
                          <TableHead>Working days</TableHead>
                          <TableHead>Leave deductions</TableHead>
                          <TableHead>Advance deduction</TableHead>
                          <TableHead>Manual adjustments</TableHead>
                          <TableHead>Net salary (AED)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentRun.lines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="p-8 text-center text-muted-foreground">
                              No employees found for this payroll run.
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentRun.lines.map((line) => {
                            const leaveDeduction =
                              parseDecimal(line.unpaid_leave_deduction) + parseDecimal(line.paid_leave_excess_deduction);
                            const hasAnyDeduction =
                              leaveDeduction > 0 ||
                              parseDecimal(line.advance_deduction) > 0 ||
                              parseDecimal(line.manual_deduction) > 0;
                            const manualNet = parseDecimal(line.manual_bonus) - parseDecimal(line.manual_deduction);
                            const approveBlockedReason = isRunFinalized
                              ? "Finalized payroll lines are locked."
                              : isRunProcessed
                                ? "Processed runs allow only Mark Paid."
                                : line.status === "APPROVED"
                                  ? "Line is already approved."
                                  : undefined;
                            const markPaidBlockedReason = isRunFinalized
                              ? "Finalized payroll lines are locked."
                              : line.status === "PAID"
                                ? "Line is already paid."
                                : undefined;
                            const warningReason = line.deduction_warning
                              ? "High deduction impact. Verify this line before final payout."
                              : "This payroll line includes deductions.";

                            return (
                              <TableRow key={line.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{line.employee?.full_name ?? "Employee"}</p>
                                    <p className="text-xs text-muted-foreground">{line.employee?.employee_data?.employee_code ?? line.employee_id}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{line.employee?.employee_data?.department ?? "-"}</TableCell>
                                <TableCell>{money(line.base_salary)}</TableCell>
                                <TableCell>{line.working_days_in_month ?? 0}</TableCell>
                                <TableCell>AED {money(leaveDeduction)}</TableCell>
                                <TableCell>AED {money(line.advance_deduction)}</TableCell>
                                <TableCell>
                                  <span className={manualNet >= 0 ? "text-emerald-700" : "text-red-700"}>
                                    {manualNet >= 0 ? "+" : "-"}AED {money(Math.abs(manualNet))}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className={line.deduction_warning ? "font-semibold text-amber-700" : "font-medium"}>
                                    AED {money(line.net_pay)}
                                  </span>
                                  {line.deduction_warning || hasAnyDeduction ? (
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={<span className="ml-2 inline-flex align-middle"><AlertTriangleIcon className="size-3.5 text-amber-600" /></span>}
                                      />
                                      <TooltipContent>{warningReason}</TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                </TableCell>
                                <TableCell>{lineStatusBadge(line.status)}</TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <Button type="button" size="sm" variant="outline" onClick={() => openLineSheet(line.id)}>
                                      View
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
                                        <MoreHorizontalIcon className="size-4" />
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openLineSheet(line.id)}>Open breakdown</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGeneratePayslip(line)}>Generate payslip</DropdownMenuItem>
                                        <ActionHint reason={approveBlockedReason}>
                                          <DropdownMenuItem
                                            disabled={Boolean(approveBlockedReason)}
                                            onClick={() => void handleApproveLineFromTable(line.id)}
                                          >
                                            Approve line
                                          </DropdownMenuItem>
                                        </ActionHint>
                                        <ActionHint reason={markPaidBlockedReason}>
                                          <DropdownMenuItem
                                            disabled={Boolean(markPaidBlockedReason)}
                                            onClick={() => void handleMarkLinePaid(line.id)}
                                          >
                                            Mark paid
                                          </DropdownMenuItem>
                                        </ActionHint>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="history">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Total payroll</TableHead>
                      <TableHead>Total deductions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>WPS export</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(historyQuery.data?.items ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">
                          No payroll history for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (historyQuery.data?.items ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{monthLabel(item.month, item.year)}</p>
                              <p className="text-xs text-muted-foreground">{item.finalized_at ? format(new Date(item.finalized_at), "PPP") : "Not finalized"}</p>
                            </div>
                          </TableCell>
                          <TableCell>{item.employee_count}</TableCell>
                          <TableCell>AED {money(item.total_payroll)}</TableCell>
                          <TableCell>AED {money(item.total_deductions)}</TableCell>
                          <TableCell>{runStatusBadge(item.status, item.finalized_at)}</TableCell>
                          <TableCell>
                            {item.wps_exported_at ? format(new Date(item.wps_exported_at), "PPP p") : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveRunId(item.id);
                                  setSelectedLineId(null);
                                  setDetailOpen(false);
                                  setActiveTab("current");
                                }}
                              >
                                Open
                              </Button>
                              <ActionHint reason={historyWpsBlockedReason}>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void wpsExportMutation.mutateAsync(item.id)}
                                  disabled={Boolean(historyWpsBlockedReason) || wpsExportMutation.isPending}
                                >
                                  WPS
                                </Button>
                              </ActionHint>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="payslips">
              {!currentRun ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Open a payroll run to generate and download employee payslips.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead>Net salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentRun.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.employee?.full_name ?? "Employee"}</TableCell>
                          <TableCell>{monthLabel(currentRun.month, currentRun.year)}</TableCell>
                          <TableCell>AED {money(line.net_pay)}</TableCell>
                          <TableCell>{lineStatusBadge(line.status)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => void handleGeneratePayslip(line)}>
                                <DownloadIcon className="mr-2 size-4" />
                                Download
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="advances" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <Label htmlFor="payroll-advance-search">Search</Label>
                  <Input
                    id="payroll-advance-search"
                    placeholder="Search employee or purpose"
                    value={advanceSearch}
                    onChange={(event) => setAdvanceSearch(event.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Button type="button" onClick={() => setNewAdvanceOpen(true)}>
                  New advance
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Amount (AED)</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Total repaid</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Monthly deduction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdvances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="p-8 text-center text-muted-foreground">
                          No advances found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAdvances.map((advance) => {
                        const amount = parseDecimal(advance.amount);
                        const outstanding = parseDecimal(advance.remaining_balance ?? advance.amount);
                        const repaid = amount - outstanding;

                        return (
                          <TableRow key={advance.id}>
                            <TableCell>{advance.employee?.full_name ?? advance.employee_id}</TableCell>
                            <TableCell>{money(advance.amount)}</TableCell>
                            <TableCell>{format(new Date(advance.created_at), "PPP")}</TableCell>
                            <TableCell>{advance.reason ?? "-"}</TableCell>
                            <TableCell>{money(repaid)}</TableCell>
                            <TableCell>{money(outstanding)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  value={
                                    advanceDraftMonthly[advance.id] ??
                                    advance.monthly_deduction ??
                                    advance.remaining_balance ??
                                    advance.amount
                                  }
                                  onChange={(event) =>
                                    setAdvanceDraftMonthly((prev) => ({
                                      ...prev,
                                      [advance.id]: event.target.value,
                                    }))
                                  }
                                  className="h-8 min-w-28"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleSaveAdvanceSchedule(advance.id)}
                                >
                                  Save
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {advance.is_cleared ? <Badge>Settled</Badge> : <Badge variant="secondary">Active</Badge>}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                {!advance.is_cleared ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void handleMarkAdvanceSettled(advance.id)}
                                  >
                                    Mark settled
                                  </Button>
                                ) : null}
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

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="min-w-xl overflow-y-auto sm:max-w-3xl">
          {!selectedLine ? null : (
            <>
              <SheetHeader>
                <SheetTitle>{selectedLine.employee?.full_name ?? "Payroll line"}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedLine.employee?.employee_data?.designation ?? "-"}
                  {selectedLine.employee?.employee_data?.department
                    ? ` | ${selectedLine.employee.employee_data.department}`
                    : ""}
                </p>
              </SheetHeader>

              <div className="space-y-4 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Run period</p>
                    <p className="font-medium">{currentRun ? monthLabel(currentRun.month, currentRun.year) : "-"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Working days</p>
                    <p className="font-medium">{selectedLine.working_days_in_month ?? 0}</p>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Earnings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Base salary</span><span>AED {money(selectedLine.base_salary)}</span></div>
                    <div className="flex justify-between"><span>Housing allowance</span><span>AED {money(selectedLine.housing_allowance)}</span></div>
                    <div className="flex justify-between"><span>Transport allowance</span><span>AED {money(selectedLine.transport_allowance)}</span></div>
                    <div className="flex justify-between"><span>Other benefits</span><span>AED {money(selectedLine.other_benefits)}</span></div>
                    <div className="flex justify-between"><span>Manual additions</span><span className="text-emerald-700">+ AED {money(lineForm.manual_bonus)}</span></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Deductions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Excess leave ({selectedLine.paid_leave_excess_days ?? 0} day(s) x AED {money(selectedLine.daily_rate)})</span>
                      <span className="text-red-700">- AED {money(selectedLine.paid_leave_excess_deduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unpaid leave ({selectedLine.unpaid_leave_days ?? 0} day(s) x AED {money(selectedLine.daily_rate)})</span>
                      <span className="text-red-700">- AED {money(selectedLine.unpaid_leave_deduction)}</span>
                    </div>
                    <div className="flex justify-between"><span>Advance recovery</span><span className="text-red-700">- AED {money(lineForm.advance_deduction)}</span></div>
                    <div className="flex justify-between"><span>Manual deductions</span><span className="text-red-700">- AED {money(lineForm.manual_deduction)}</span></div>
                  </CardContent>
                </Card>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-900">Net payable</p>
                  <p className="text-2xl font-semibold text-amber-900">
                    AED {money(
                      parseDecimal(selectedLine.base_salary) +
                        parseDecimal(selectedLine.housing_allowance) +
                        parseDecimal(selectedLine.transport_allowance) +
                        parseDecimal(selectedLine.other_benefits) +
                        parseDecimal(lineForm.manual_bonus) -
                        parseDecimal(selectedLine.unpaid_leave_deduction) -
                        parseDecimal(selectedLine.paid_leave_excess_deduction) -
                        parseDecimal(lineForm.advance_deduction) -
                        parseDecimal(lineForm.manual_deduction),
                    )}
                  </p>
                </div>

                <Separator />

                {!canEditFinancials ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    {isRunFinalized
                      ? "This run is finalized. Payroll lines are read-only."
                      : "This run is processed. Financial edits are locked. Use Mark Paid from the table actions if needed."}
                  </p>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Manual addition (AED)</Label>
                    <Input
                      disabled={!canEditFinancials}
                      value={lineForm.manual_bonus}
                      onChange={(event) => setLineForm((prev) => ({ ...prev, manual_bonus: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Manual deduction (AED)</Label>
                    <Input
                      disabled={!canEditFinancials}
                      value={lineForm.manual_deduction}
                      onChange={(event) => setLineForm((prev) => ({ ...prev, manual_deduction: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Advance deduction this month (AED)</Label>
                    <Input
                      disabled={!canEditFinancials}
                      value={lineForm.advance_deduction}
                      onChange={(event) => setLineForm((prev) => ({ ...prev, advance_deduction: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      disabled={!canEditFinancials}
                      value={lineForm.status}
                      onValueChange={(value) =>
                        setLineForm((prev) => ({
                          ...prev,
                          status: (value as LineFormState["status"]) ?? "DRAFT",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    disabled={!canEditFinancials}
                    value={lineForm.notes}
                    onChange={(event) => setLineForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Manual note for payroll, deductions, or approvals"
                  />
                </div>
              </div>

              <SheetFooter className="sm:flex-row">
                <ActionHint reason={saveLineBlockedReason}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSaveLine()}
                    disabled={Boolean(saveLineBlockedReason) || lineUpdateMutation.isPending}
                  >
                    Save changes
                  </Button>
                </ActionHint>
                <ActionHint reason={approveLineBlockedReason}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleApproveLine()}
                    disabled={Boolean(approveLineBlockedReason) || lineUpdateMutation.isPending}
                  >
                    Approve
                  </Button>
                </ActionHint>
                <Button
                  type="button"
                  onClick={() => void handleGeneratePayslip(selectedLine)}
                  disabled={adminPayslipMutation.isPending}
                >
                  Generate payslip
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={newAdvanceOpen} onOpenChange={setNewAdvanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Advance</DialogTitle>
            <DialogDescription>Create an advance and assign monthly recovery amount.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={newAdvanceEmployeeId || "none"}
                onValueChange={(value) => setNewAdvanceEmployeeId(value === "none" ? "" : (value ?? ""))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select employee</SelectItem>
                  {(employeesQuery.data?.data ?? []).map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount (AED)</Label>
                <Input value={newAdvanceAmount} onChange={(event) => setNewAdvanceAmount(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Monthly deduction (AED)</Label>
                <Input
                  value={newAdvanceMonthlyDeduction}
                  onChange={(event) => setNewAdvanceMonthlyDeduction(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea value={newAdvanceReason} onChange={(event) => setNewAdvanceReason(event.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewAdvanceOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateAdvance()} disabled={createAdvanceMutation.isPending}>
              Create advance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
