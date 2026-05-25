"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarClockIcon,
  DownloadIcon,
  FileTextIcon,
  LandmarkIcon,
  ReceiptTextIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  UsersIcon,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  chartPalette,
  chartTooltipCursor,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EmploymentStatus, EmploymentType, ReportTab } from "@/lib/api/types";
import {
  useReportsExportMutation,
  useReportsHeadcountQuery,
  useReportsLeaveQuery,
  useReportsOverviewQuery,
  useReportsPayrollQuery,
  useReportsTurnoverQuery,
  useReportsVisaQuery,
} from "@/lib/query/hooks";

function toMonthInputValue(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: string | number | null | undefined) {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function visaStatusBadge(status: string) {
  if (status === "EXPIRED") return <Badge variant="destructive">Expired</Badge>;
  if (status === "EXPIRING_30_DAYS") return <Badge variant="destructive">Expiring in 30d</Badge>;
  if (status === "EXPIRING_60_DAYS") return <Badge variant="secondary">Expiring in 60d</Badge>;
  if (status === "EXPIRING_90_DAYS") return <Badge variant="secondary">Expiring in 90d</Badge>;
  if (status === "MISSING") return <Badge variant="outline">Missing</Badge>;
  return <Badge>Valid</Badge>;
}

export default function AdminReportsPage() {
  const [month, setMonth] = useState(() => toMonthInputValue(new Date()));
  const [activeTab, setActiveTab] = useState<ReportTab>("headcount");

  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");

  const [employmentType, setEmploymentType] = useState<"all" | EmploymentType>("all");
  const [employmentStatus, setEmploymentStatus] = useState<"all" | EmploymentStatus>("all");

  const [leaveType, setLeaveType] = useState("all");
  const [leaveStatus, setLeaveStatus] = useState("all");

  const [reasonCode, setReasonCode] = useState("");

  const overviewQ = useReportsOverviewQuery(month);

  const headcountQ = useReportsHeadcountQuery({
    month,
    department: department.trim() || undefined,
    search: search.trim() || undefined,
    employment_type: employmentType === "all" ? undefined : employmentType,
    status: employmentStatus === "all" ? undefined : employmentStatus,
    enabled: activeTab === "headcount",
  });

  const payrollQ = useReportsPayrollQuery({
    month,
    department: department.trim() || undefined,
    search: search.trim() || undefined,
    enabled: activeTab === "payroll",
  });

  const leaveQ = useReportsLeaveQuery({
    month,
    search: search.trim() || undefined,
    leave_type: leaveType === "all" ? undefined : leaveType,
    status: leaveStatus === "all" ? undefined : leaveStatus,
    enabled: activeTab === "leave",
  });

  const turnoverQ = useReportsTurnoverQuery({
    month,
    department: department.trim() || undefined,
    search: search.trim() || undefined,
    reason_code: reasonCode.trim() || undefined,
    enabled: activeTab === "turnover",
  });

  const visaQ = useReportsVisaQuery({
    month,
    department: department.trim() || undefined,
    search: search.trim() || undefined,
    enabled: activeTab === "visa",
  });

  const exportMutation = useReportsExportMutation();

  const activeLoading =
    (activeTab === "headcount" && headcountQ.isLoading) ||
    (activeTab === "payroll" && payrollQ.isLoading) ||
    (activeTab === "leave" && leaveQ.isLoading) ||
    (activeTab === "turnover" && turnoverQ.isLoading) ||
    (activeTab === "visa" && visaQ.isLoading);

  if (overviewQ.isLoading && !overviewQ.data) {
    return <PageSkeleton />;
  }

  const headcount = headcountQ.data;
  const payroll = payrollQ.data;
  const leave = leaveQ.data;
  const turnover = turnoverQ.data;
  const visa = visaQ.data;

  const headcountStatusConfig: ChartConfig = Object.fromEntries(
    (headcount?.by_status ?? []).map((entry, index) => [
      entry.status,
      {
        label: entry.status,
        color: chartPalette[index % chartPalette.length],
      },
    ]),
  );

  const leaveTypeConfig: ChartConfig = Object.fromEntries(
    (leave?.by_type ?? []).map((entry, index) => [
      entry.leave_type,
      {
        label: entry.leave_type,
        color: chartPalette[index % chartPalette.length],
      },
    ]),
  );

  const turnoverReasonConfig: ChartConfig = Object.fromEntries(
    (turnover?.by_reason ?? []).map((entry, index) => [
      entry.reason_code,
      {
        label: entry.reason_code,
        color: chartPalette[index % chartPalette.length],
      },
    ]),
  );

  const visaTypeConfig: ChartConfig = Object.fromEntries(
    (visa?.by_visa_type ?? []).map((entry, index) => [
      entry.visa_type,
      {
        label: entry.visa_type,
        color: chartPalette[index % chartPalette.length],
      },
    ]),
  );

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      await exportMutation.mutateAsync({
        tab: activeTab,
        format,
        month,
        department: department.trim() || undefined,
        search: search.trim() || undefined,
        employment_type: activeTab === "headcount" && employmentType !== "all" ? employmentType : undefined,
        status: activeTab === "headcount" && employmentStatus !== "all" ? employmentStatus : undefined,
        leave_type: activeTab === "leave" && leaveType !== "all" ? leaveType : undefined,
        reason_code: activeTab === "turnover" ? reasonCode.trim() || undefined : undefined,
      });
      toast.success(`Exported ${activeTab} report (${format.toUpperCase()})`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Dynamic workforce, payroll, leave, turnover, and UAE visa compliance insights.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-42.5" />
          <Button
            type="button"
            variant="outline"
            disabled={exportMutation.isPending}
            onClick={() => handleExport("csv")}
          >
            <DownloadIcon className="mr-2 size-4" />
            Export CSV
          </Button>
          <Button type="button" disabled={exportMutation.isPending} onClick={() => handleExport("pdf")}>
            <DownloadIcon className="mr-2 size-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Employees"
          value={String(overviewQ.data?.total_employees ?? 0)}
          change={overviewQ.data ? `${overviewQ.data.label}` : "-"}
          changeType="neutral"
          icon={UsersIcon}
          delay={0}
        />
        <MetricCard
          title="Payroll Cost"
          value={`AED ${money(overviewQ.data?.payroll_cost ?? 0)}`}
          change="Monthly net payroll"
          changeType="neutral"
          icon={LandmarkIcon}
          delay={1}
        />
        <MetricCard
          title="Absence Rate"
          value={`${(overviewQ.data?.absence_rate ?? 0).toFixed(2)}%`}
          change="Working-day adjusted"
          changeType="neutral"
          icon={CalendarClockIcon}
          delay={2}
        />
        <MetricCard
          title="Turnover Rate"
          value={`${(overviewQ.data?.turnover_rate ?? 0).toFixed(2)}%`}
          change="Completed offboarding"
          changeType="neutral"
          icon={UserMinusIcon}
          delay={3}
        />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Filter Workspace</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="flex min-w-55 items-center gap-2">
              <Label className="whitespace-nowrap text-xs text-muted-foreground">Department</Label>
              <Input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Finance" />
            </div>
            <div className="flex min-w-60 items-center gap-2">
              <Label className="whitespace-nowrap text-xs text-muted-foreground">Search</Label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Employee, email, code" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReportTab)}>
            <TabsList className="mb-4 grid w-full grid-cols-2 gap-2 md:grid-cols-5">
              <TabsTrigger value="headcount">Headcount</TabsTrigger>
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
              <TabsTrigger value="turnover">Turnover</TabsTrigger>
              <TabsTrigger value="visa">Visa</TabsTrigger>
            </TabsList>

            <TabsContent value="headcount" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="space-y-1">
                  <Label htmlFor="reports-employment-type" className="text-xs text-muted-foreground">Employment type</Label>
                  <Select value={employmentType} onValueChange={(value) => value != null && setEmploymentType(value as "all" | EmploymentType)}>
                    <SelectTrigger id="reports-employment-type" className="w-45">
                      <SelectValue placeholder="Employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="FULL_TIME">Full-time</SelectItem>
                      <SelectItem value="PART_TIME">Part-time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reports-employment-status" className="text-xs text-muted-foreground">Employment status</Label>
                  <Select value={employmentStatus} onValueChange={(value) => value != null && setEmploymentStatus(value as "all" | EmploymentStatus)}>
                    <SelectTrigger id="reports-employment-status" className="w-50">
                      <SelectValue placeholder="Employment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                      <SelectItem value="TERMINATING">Terminating</SelectItem>
                      <SelectItem value="TERMINATED">Terminated</SelectItem>
                      <SelectItem value="CANDIDATE">Candidate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Total employees"
                  value={headcount?.summary.total_employees ?? 0}
                  icon={UsersIcon}
                />
                <StatCard
                  title="Active employees"
                  value={headcount?.summary.active_employees ?? 0}
                  icon={ShieldCheckIcon}
                  tone="success"
                />
                <StatCard
                  title="Probation ending in 30d"
                  value={headcount?.summary.probation_ending_30_days ?? 0}
                  icon={CalendarClockIcon}
                  tone="warning"
                />
                <StatCard
                  title="Contracts ending in 30d"
                  value={headcount?.summary.contracts_ending_30_days ?? 0}
                  icon={FileTextIcon}
                  tone="warning"
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Headcount by Department</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      id="reports-headcount-by-department"
                      config={{ count: { label: "Employees", color: "var(--chart-1)" } } satisfies ChartConfig}
                      className="h-50 w-full"
                    >
                      <BarChart data={headcount?.by_department ?? []} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} accessibilityLayer>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-muted/50" />
                        <XAxis dataKey="department" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={chartTooltipCursor} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Employment Status Mix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer id="reports-headcount-status-mix" config={headcountStatusConfig} className="h-50 w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
                        <Pie data={headcount?.by_status ?? []} dataKey="count" nameKey="status" innerRadius="55%" outerRadius="78%" strokeWidth={2}>
                          {(headcount?.by_status ?? []).map((entry, index) => (
                            <Cell key={entry.status} fill={chartPalette[index % chartPalette.length]} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="status" />} verticalAlign="bottom" />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Employment Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joining Date</TableHead>
                      <TableHead>Contract End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(headcount?.rows ?? []).map((row) => (
                      <TableRow key={row.employee_id}>
                        <TableCell>
                          <div className="font-medium">{row.full_name}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.employment_type}</TableCell>
                        <TableCell>{row.employment_status}</TableCell>
                        <TableCell>{formatDate(row.joining_date)}</TableCell>
                        <TableCell>{formatDate(row.contract_end_date)}</TableCell>
                      </TableRow>
                    ))}
                    {(headcount?.rows.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                          No headcount rows match the filters.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="payroll" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Run status"
                  value={
                    <Badge variant={payroll?.summary.run_status === "NOT_GENERATED" ? "outline" : "secondary"}>
                      {payroll?.summary.run_status ?? "NOT_GENERATED"}
                    </Badge>
                  }
                  icon={ShieldAlertIcon}
                  valueClassName="text-base sm:text-lg"
                />
                <StatCard
                  title="Employees in run"
                  value={payroll?.summary.employee_count ?? 0}
                  icon={UsersIcon}
                />
                <StatCard
                  title="Total net payroll"
                  value={`AED ${money(payroll?.summary.total_payroll)}`}
                  icon={LandmarkIcon}
                />
                <StatCard
                  title="Total deductions"
                  value={`AED ${money(payroll?.summary.total_deductions)}`}
                  icon={ReceiptTextIcon}
                  tone="warning"
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payroll Trend (6 months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      id="reports-payroll-trend"
                      config={{ total_payroll: { label: "Net Payroll", color: "var(--chart-1)" } } satisfies ChartConfig}
                      className="h-50 w-full"
                    >
                      <BarChart
                        data={(payroll?.trend ?? []).map((row) => ({ ...row, total_payroll: toNumber(row.total_payroll) }))}
                        margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                        accessibilityLayer
                      >
                        <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-muted/50" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={chartTooltipCursor} />
                        <Bar dataKey="total_payroll" fill="var(--color-total_payroll)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Earnings vs Deductions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      id="reports-payroll-breakdown"
                      config={{
                        Earnings: { label: "Earnings", color: chartPalette[0] },
                        Deductions: { label: "Deductions", color: chartPalette[1] },
                        Net: { label: "Net", color: chartPalette[2] },
                      }}
                      className="h-50 w-full"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                        <Pie
                          data={(payroll?.earnings_vs_deductions ?? []).map((row) => ({ ...row, amount: toNumber(row.amount) }))}
                          dataKey="amount"
                          nameKey="name"
                          innerRadius="55%"
                          outerRadius="78%"
                          strokeWidth={2}
                        >
                          {(payroll?.earnings_vs_deductions ?? []).map((entry, index) => (
                            <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} verticalAlign="bottom" />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Base Salary</TableHead>
                      <TableHead className="text-right">Allowances</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payroll?.rows ?? []).map((row) => (
                      <TableRow key={row.employee_id}>
                        <TableCell>
                          <div className="font-medium">{row.full_name}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell className="text-right tabular-nums">AED {money(row.base_salary)}</TableCell>
                        <TableCell className="text-right tabular-nums">AED {money(row.allowances)}</TableCell>
                        <TableCell className="text-right tabular-nums">AED {money(row.deductions)}</TableCell>
                        <TableCell className="text-right tabular-nums">AED {money(row.net_pay)}</TableCell>
                        <TableCell>{row.line_status}</TableCell>
                      </TableRow>
                    ))}
                    {(payroll?.rows.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                          No payroll rows available for this month.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="leave" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="space-y-1">
                  <Label htmlFor="reports-leave-type" className="text-xs text-muted-foreground">Leave type</Label>
                  <Select value={leaveType} onValueChange={(value) => value != null && setLeaveType(value)}>
                    <SelectTrigger id="reports-leave-type" className="w-42.5">
                      <SelectValue placeholder="Leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All leave types</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                      <SelectItem value="SICK">Sick</SelectItem>
                      <SelectItem value="UNPAID">Unpaid</SelectItem>
                      <SelectItem value="MATERNITY">Maternity</SelectItem>
                      <SelectItem value="PATERNITY">Paternity</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reports-leave-status" className="text-xs text-muted-foreground">Leave status</Label>
                  <Select value={leaveStatus} onValueChange={(value) => value != null && setLeaveStatus(value)}>
                    <SelectTrigger id="reports-leave-status" className="w-42.5">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Requests total"
                  value={leave?.summary.requests_total ?? 0}
                  icon={CalendarClockIcon}
                />
                <StatCard
                  title="Approved"
                  value={leave?.summary.approved ?? 0}
                  icon={ShieldCheckIcon}
                  tone="success"
                />
                <StatCard
                  title="On leave today"
                  value={leave?.summary.on_leave_today ?? 0}
                  icon={UserMinusIcon}
                  tone="warning"
                />
                <StatCard
                  title="Absence rate"
                  value={`${(leave?.summary.absence_rate ?? 0).toFixed(2)}%`}
                  icon={ShieldAlertIcon}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Request Trend (6 months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      id="reports-leave-trend"
                      config={{
                        requests: { label: "Requests", color: "var(--chart-1)" },
                        approved: { label: "Approved", color: "var(--chart-2)" },
                      }}
                      className="h-50 w-full"
                    >
                      <BarChart data={leave?.trend ?? []} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} accessibilityLayer>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-muted/50" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={chartTooltipCursor} />
                        <Bar dataKey="requests" fill="var(--color-requests)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="approved" fill="var(--color-approved)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Leave Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer id="reports-leave-type-mix" config={leaveTypeConfig} className="h-50 w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="leave_type" />} />
                        <Pie data={leave?.by_type ?? []} dataKey="count" nameKey="leave_type" innerRadius="55%" outerRadius="78%" strokeWidth={2}>
                          {(leave?.by_type ?? []).map((entry, index) => (
                            <Cell key={entry.leave_type} fill={chartPalette[index % chartPalette.length]} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="leave_type" />} verticalAlign="bottom" />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="text-right">Working Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(leave?.rows ?? []).map((row) => (
                      <TableRow key={row.leave_id}>
                        <TableCell>
                          <div className="font-medium">{row.full_name}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.leave_type}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{formatDate(row.start_date)}</TableCell>
                        <TableCell>{formatDate(row.end_date)}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.working_days}</TableCell>
                      </TableRow>
                    ))}
                    {(leave?.rows.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                          No leave rows available for this period.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="turnover" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="flex min-w-70 items-center gap-2">
                  <Label htmlFor="reports-reason-code" className="whitespace-nowrap text-xs text-muted-foreground">Reason code</Label>
                  <Input id="reports-reason-code" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} placeholder="Voluntary, contract_end..." />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Joiners"
                  value={turnover?.summary.joiners ?? 0}
                  icon={UsersIcon}
                  tone="success"
                />
                <StatCard
                  title="Leavers"
                  value={turnover?.summary.leavers ?? 0}
                  icon={UserMinusIcon}
                  tone="danger"
                />
                <StatCard
                  title="Turnover rate"
                  value={`${(turnover?.summary.turnover_rate ?? 0).toFixed(2)}%`}
                  icon={CalendarClockIcon}
                  tone="warning"
                />
                <StatCard
                  title="Open offboarding"
                  value={turnover?.summary.open_offboarding_cases ?? 0}
                  icon={ShieldAlertIcon}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Joiners vs Leavers Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      id="reports-turnover-trend"
                      config={{
                        joiners: { label: "Joiners", color: "var(--chart-1)" },
                        leavers: { label: "Leavers", color: "var(--chart-2)" },
                      }}
                      className="h-50 w-full"
                    >
                      <BarChart data={turnover?.trend ?? []} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} accessibilityLayer>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-muted/50" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={chartTooltipCursor} />
                        <Bar dataKey="joiners" fill="var(--color-joiners)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="leavers" fill="var(--color-leavers)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Leaver Reason Mix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer id="reports-turnover-reasons" config={turnoverReasonConfig} className="h-50 w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="reason_code" />} />
                        <Pie data={turnover?.by_reason ?? []} dataKey="count" nameKey="reason_code" innerRadius="55%" outerRadius="78%" strokeWidth={2}>
                          {(turnover?.by_reason ?? []).map((entry, index) => (
                            <Cell key={entry.reason_code} fill={chartPalette[index % chartPalette.length]} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="reason_code" />} verticalAlign="bottom" />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(turnover?.rows ?? []).map((row) => (
                      <TableRow key={row.case_id}>
                        <TableCell>
                          <div className="font-medium">{row.full_name}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.reason_code}</TableCell>
                        <TableCell>{formatDate(row.effective_date)}</TableCell>
                        <TableCell>{formatDate(row.completed_at)}</TableCell>
                      </TableRow>
                    ))}
                    {(turnover?.rows.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                          No turnover rows available for this period.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="visa" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Compliance rate"
                  value={`${(visa?.summary.compliance_rate ?? 0).toFixed(2)}%`}
                  icon={ShieldCheckIcon}
                  tone="success"
                />
                <StatCard
                  title="Expired"
                  value={visa?.summary.expired ?? 0}
                  icon={ShieldAlertIcon}
                  tone="danger"
                  valueClassName="text-destructive"
                />
                <StatCard
                  title="Expiring in 30 days"
                  value={visa?.summary.expiring_30_days ?? 0}
                  icon={CalendarClockIcon}
                  tone="warning"
                />
                <StatCard
                  title="Missing data"
                  value={visa?.summary.missing ?? 0}
                  icon={FileTextIcon}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Compliance Risk Buckets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      id="reports-visa-buckets"
                      config={{ count: { label: "Employees", color: "var(--chart-1)" } } satisfies ChartConfig}
                      className="h-50 w-full"
                    >
                      <BarChart data={visa?.expiry_buckets ?? []} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} accessibilityLayer>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-muted/50" />
                        <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={chartTooltipCursor} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Visa Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer id="reports-visa-types" config={visaTypeConfig} className="h-50 w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="visa_type" />} />
                        <Pie data={visa?.by_visa_type ?? []} dataKey="count" nameKey="visa_type" innerRadius="55%" outerRadius="78%" strokeWidth={2}>
                          {(visa?.by_visa_type ?? []).map((entry, index) => (
                            <Cell key={entry.visa_type} fill={chartPalette[index % chartPalette.length]} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="visa_type" />} verticalAlign="bottom" />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Visa Type</TableHead>
                      <TableHead>Visa Number</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Days to Expiry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(visa?.rows ?? []).map((row) => (
                      <TableRow key={row.employee_id}>
                        <TableCell>
                          <div className="font-medium">{row.full_name}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.visa_type}</TableCell>
                        <TableCell>{row.visa_number ?? "-"}</TableCell>
                        <TableCell>{formatDate(row.visa_expiry)}</TableCell>
                        <TableCell>{visaStatusBadge(row.status)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.days_to_expiry == null ? <ShieldAlertIcon className="ml-auto size-4 text-muted-foreground" /> : row.days_to_expiry}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(visa?.rows.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                          No visa rows available for this period.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          {activeLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading {activeTab} analytics...</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">Active tab: {activeTab} | Period: {month}</div>
    </div>
  );
}
