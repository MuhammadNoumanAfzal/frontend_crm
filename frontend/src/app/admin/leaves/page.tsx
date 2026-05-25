"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaveStatusBadge, LeaveTypeBadge } from "@/components/leaves/leave-badges";
import {
  useAdminLeaveBalancesQuery,
  useAdminLeavesQuery,
  useCreatePublicHolidayMutation,
  useDeletePublicHolidayMutation,
  useEmployeesQuery,
  useLeaveAdminStatsQuery,
  useLeaveCalendarQuery,
  useLeaveOverridesQuery,
  useLeaveReviewMutation,
  useLeaveSettingsMutation,
  useLeaveSettingsQuery,
  useUpsertLeaveOverrideMutation,
} from "@/lib/query/hooks";
import type { LeaveCalendarEvent, LeaveRequest, LeavePolicyRow, PublicHolidayRow } from "@/lib/api/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangleIcon, CalendarClockIcon, Clock3Icon, UserRoundCheckIcon } from "lucide-react";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function AdminLeavesPage() {
  const now = useMemo(() => new Date(), []);
  const [periodY, setPeriodY] = useState(now.getUTCFullYear());
  const [periodM, setPeriodM] = useState(now.getUTCMonth() + 1);

  const [tab, setTab] = useState("requests");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const [calY, setCalY] = useState(now.getUTCFullYear());
  const [calM, setCalM] = useState(now.getUTCMonth() + 1);

  const stats = useLeaveAdminStatsQuery(periodY, periodM);
  const leavesQ = useAdminLeavesQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
    user_id: userFilter === "all" ? undefined : userFilter,
    page: 1,
    limit: 150,
  });
  const employees = useEmployeesQuery({ page: 1, limit: 200 });
  const calendar = useLeaveCalendarQuery(calY, calM);
  const settings = useLeaveSettingsQuery();
  const overrides = useLeaveOverridesQuery("");

  const review = useLeaveReviewMutation();
  const saveSettings = useLeaveSettingsMutation();
  const createHoliday = useCreatePublicHolidayMutation();
  const deleteHoliday = useDeletePublicHolidayMutation();
  const upsertOverride = useUpsertLeaveOverrideMutation();

  const [detail, setDetail] = useState<LeaveRequest | null>(null);
  const [balanceSearch, setBalanceSearch] = useState("");
  const balancesQ = useAdminLeaveBalancesQuery(1, balanceSearch.trim() || undefined);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideUserId, setOverrideUserId] = useState("");
  const [overridePolicyId, setOverridePolicyId] = useState("");
  const [overrideLimit, setOverrideLimit] = useState("21");

  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await review.mutateAsync({ leaveId: id, status });
      await leavesQ.refetch();
      toast.success(`Leave ${status.toLowerCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const leaveRows = leavesQ.data?.items ?? [];
  const employeeOptions = employees.data?.data ?? [];

  const calendarDays = useMemo(() => {
    const first = new Date(Date.UTC(calY, calM - 1, 1));
    const last = new Date(Date.UTC(calY, calM, 0));
    const startPad = (first.getUTCDay() + 6) % 7;
    const days: { label: number | ""; iso?: string; weekend?: boolean }[] = [];
    for (let i = 0; i < startPad; i++) days.push({ label: "" });
    for (let d = 1; d <= last.getUTCDate(); d++) {
      const iso = `${calY}-${String(calM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dt = new Date(Date.UTC(calY, calM - 1, d));
      const w = dt.getUTCDay();
      days.push({ label: d, iso, weekend: w === 0 || w === 6 });
    }
    return days;
  }, [calY, calM]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, LeaveCalendarEvent[]>();
    for (const ev of calendar.data ?? []) {
      const s = new Date(ev.start_date);
      const e = new Date(ev.end_date);
      let t = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
      const endMs = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
      while (t <= endMs) {
        const key = format(new Date(t), "yyyy-MM-dd");
        const arr = map.get(key) ?? [];
        arr.push(ev);
        map.set(key, arr);
        t += 86_400_000;
      }
    }
    return map;
  }, [calendar.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leave management</h1>
          <p className="text-sm text-muted-foreground">
            Requests, balances, calendar, and policy — {format(new Date(Date.UTC(periodY, periodM - 1, 1)), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Stats period</Label>
            <Input
              className="h-9 w-24"
              type="number"
              value={periodM}
              min={1}
              max={12}
              onChange={(e) => setPeriodM(Number(e.target.value))}
            />
            <Input
              className="h-9 w-28"
              type="number"
              value={periodY}
              onChange={(e) => setPeriodY(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Requests this month"
          value={stats.isLoading ? "—" : stats.data?.requests_this_month ?? 0}
          icon={CalendarClockIcon}
        />
        <StatCard
          title="Pending approval"
          value={stats.isLoading ? "—" : stats.data?.pending_approval ?? 0}
          icon={Clock3Icon}
          tone="warning"
          valueClassName="text-amber-700 dark:text-amber-400"
        />
        <StatCard
          title="On leave today"
          value={stats.isLoading ? "—" : stats.data?.on_leave_today ?? 0}
          icon={UserRoundCheckIcon}
          tone="success"
          valueClassName="text-sky-700 dark:text-sky-400"
        />
        <StatCard
          title={`Excess deductions (${periodM}/${periodY})`}
          value={stats.isLoading ? "—" : stats.data?.excess_deductions_month ?? "0"}
          icon={AlertTriangleIcon}
          tone="danger"
          valueClassName="text-red-700 dark:text-red-400"
        />
      </div>

      <Card className="overflow-hidden">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="border-b px-4">
            <TabsList className="h-12 w-full justify-start gap-6 bg-transparent p-0">
              <TabsTrigger value="requests" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Requests
              </TabsTrigger>
              <TabsTrigger value="balances" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Balances
              </TabsTrigger>
              <TabsTrigger value="calendar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Calendar
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="requests" className="m-0">
            <div className="flex flex-wrap items-center gap-2 border-b p-4">
              <div className="space-y-1">
                <Label htmlFor="leave-request-status">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => v != null && setStatusFilter(v)}>
                  <SelectTrigger id="leave-request-status" className="w-[160px]">
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
              <div className="space-y-1">
                <Label htmlFor="leave-request-type">Type</Label>
                <Select value={typeFilter} onValueChange={(v) => v != null && setTypeFilter(v)}>
                  <SelectTrigger id="leave-request-type" className="w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                    <SelectItem value="SICK">Sick</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="MATERNITY">Maternity</SelectItem>
                    <SelectItem value="PATERNITY">Paternity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="leave-request-employee">Employee</Label>
                <Select value={userFilter} onValueChange={(v) => v != null && setUserFilter(v)}>
                  <SelectTrigger id="leave-request-employee" className="w-[220px]">
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employeeOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Exceeds?</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leavesQ.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="p-8 text-center text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : leaveRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="p-8 text-center text-muted-foreground">
                        No requests match filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaveRows.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarImage src={leave.user?.avatar_url ?? "/images/user-default.avif"} />
                              <AvatarFallback>{(leave.user?.full_name ?? "?").slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{leave.user?.full_name ?? "—"}</div>
                              <div className="truncate text-xs text-muted-foreground">{leave.user?.email}</div>
                            </div>
                          </div>
                        </TableCell>
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
                        <TableCell>
                          {(leave.excess_days ?? 0) > 0 ? (
                            <Badge variant="destructive" className="font-normal">
                              Yes ({leave.excess_days}d)
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-normal">
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(leave.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button type="button" variant="outline" size="sm" onClick={() => setDetail(leave)}>
                              View
                            </Button>
                            {leave.status === "PENDING" ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={review.isPending}
                                  onClick={() => handleReview(leave.id, "APPROVED")}
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  disabled={review.isPending}
                                  onClick={() => handleReview(leave.id, "REJECTED")}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="balances" className="m-0 space-y-4 p-4">
            <div className="max-w-md space-y-1">
              <Label htmlFor="leave-balance-search">Search employee</Label>
              <div className="flex gap-2">
                <Input
                  id="leave-balance-search"
                  placeholder="Search employee..."
                  value={balanceSearch}
                  onChange={(e) => setBalanceSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Annual</TableHead>
                    <TableHead>Sick</TableHead>
                    <TableHead>Emergency</TableHead>
                    <TableHead className="text-right">Excess (YTD est.)</TableHead>
                    <TableHead className="text-right">Salary deduction (est.)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(balancesQ.data?.items ?? []).map((row) => (
                    <TableRow key={String(row.user_id)}>
                      <TableCell className="font-medium">{String(row.full_name)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {Number(row.annual_used ?? 0)}/{row.annual_limit == null ? "∞" : String(row.annual_limit)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {Number(row.sick_used ?? 0)}/{row.sick_limit == null ? "∞" : String(row.sick_limit)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {Number(row.emergency_used ?? 0)}/
                        {row.emergency_limit == null ? "∞" : String(row.emergency_limit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{String(row.excess_days_ytd ?? 0)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {String(row.currency ?? "")} {String(row.salary_deduction_estimate ?? "0")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOverrideUserId(String(row.user_id));
                            setOverrideOpen(true);
                          }}
                        >
                          Adjust limits
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="m-0 space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (calM <= 1) {
                      setCalM(12);
                      setCalY((y) => y - 1);
                    } else setCalM(calM - 1);
                  }}
                >
                  Prev
                </Button>
                <span className="min-w-[140px] text-center text-sm font-medium">
                  {format(new Date(Date.UTC(calY, calM - 1, 1)), "MMMM yyyy")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (calM >= 12) {
                      setCalM(1);
                      setCalY((y) => y + 1);
                    } else setCalM(calM + 1);
                  }}
                >
                  Next
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2.5 rounded-sm bg-sky-200" /> Annual
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2.5 rounded-sm bg-rose-200" /> Sick
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2.5 rounded-sm bg-amber-200" /> Emergency
                </span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
              {calendarDays.map((cell, idx) => (
                <div
                  key={idx}
                  className={`min-h-[72px] rounded-md border p-1 text-left text-xs ${cell.weekend ? "bg-muted/40" : "bg-card"
                    } ${!cell.iso ? "border-transparent bg-transparent" : ""}`}
                >
                  {cell.label ? <div className="font-medium text-foreground">{cell.label}</div> : null}
                  {cell.iso
                    ? (eventsByDay.get(cell.iso) ?? []).slice(0, 3).map((ev) => (
                      <Tooltip key={ev.id}>
                        <TooltipTrigger>
                          <div
                            className={`mt-0.5 cursor-default truncate rounded px-0.5 text-[10px] ${ev.type === "SICK"
                                ? "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100"
                                : ev.type === "EMERGENCY"
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-50"
                                  : "bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-100"
                              }`}
                          >
                            {ev.full_name.split(" ")[0]}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{ev.full_name}</p>
                          <p className="text-xs text-muted-foreground">{ev.type}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))
                    : null}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="m-0 space-y-8 p-4">
            {settings.isLoading ? (
              <PageSkeleton />
            ) : (
              <>
                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Global policy</h3>
                    <p className="text-sm text-muted-foreground">Defaults per leave type and org-wide rules.</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Charge excess leave from salary</p>
                      <p className="text-sm text-muted-foreground">
                        When off, employees cannot submit requests beyond their limit.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={settings.data?.charge_excess_from_salary ? "default" : "secondary"}
                      size="sm"
                      onClick={async () => {
                        try {
                          await saveSettings.mutateAsync({
                            charge_excess_from_salary: !settings.data?.charge_excess_from_salary,
                          });
                          await settings.refetch();
                          toast.success("Updated");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      {settings.data?.charge_excess_from_salary ? "On" : "Off"}
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Limit (days)</TableHead>
                          <TableHead>Enforce</TableHead>
                          <TableHead>Carry forward</TableHead>
                          <TableHead>Max carry</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(settings.data?.policies ?? []).map((p: LeavePolicyRow) => (
                          <PolicyEditorRow
                            key={p.id}
                            policy={p}
                            onSave={async (patch) => {
                              try {
                                await saveSettings.mutateAsync({ policies: [{ id: p.id, ...patch }] });
                                await settings.refetch();
                                toast.success("Saved");
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Failed");
                              }
                            }}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <h3 className="text-sm font-medium">Public holidays</h3>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="max-w-xs"
                      placeholder="Holiday name"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                    />
                    <DatePicker className="w-48" value={newHolidayDate} onChange={setNewHolidayDate} placeholder="Holiday date" />
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!newHolidayName || !newHolidayDate) {
                          toast.error("Name and date required");
                          return;
                        }
                        try {
                          const d = new Date(newHolidayDate + "T12:00:00.000Z");
                          await createHoliday.mutateAsync({
                            date: d.toISOString(),
                            name: newHolidayName,
                            country_code: "PK",
                          });
                          setNewHolidayName("");
                          setNewHolidayDate("");
                          await settings.refetch();
                          toast.success("Holiday added");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      Add holiday
                    </Button>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right"> </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(settings.data?.holidays ?? []).map((h: PublicHolidayRow) => (
                          <TableRow key={h.id}>
                            <TableCell>{formatDate(h.date)}</TableCell>
                            <TableCell>{h.name}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={async () => {
                                  try {
                                    await deleteHoliday.mutateAsync(h.id);
                                    await settings.refetch();
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : "Failed");
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <h3 className="text-sm font-medium">Per-employee overrides</h3>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Policy</TableHead>
                          <TableHead>Custom limit</TableHead>
                          <TableHead>Default</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(overrides.data ?? []).map((o) => (
                          <TableRow key={o.id}>
                            <TableCell className="font-medium">{o.user.full_name}</TableCell>
                            <TableCell>{o.policy.display_name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">Override: {o.custom_limit ?? "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{o.policy.default_limit_days ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      <Sheet open={Boolean(detail)} onOpenChange={() => setDetail(null)}>
        <SheetContent className="sm:max-w-md px-4">
          <SheetHeader>
            <SheetTitle>Leave request</SheetTitle>
          </SheetHeader>
          {detail ? (
            <div className="mt-6 space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Employee:</span> {detail.user?.full_name}
              </p>
              <p>
                <span className="text-muted-foreground">Type:</span> {detail.type}
              </p>
              <p>
                <span className="text-muted-foreground">Dates:</span> {formatDate(detail.start_date)} –{" "}
                {formatDate(detail.end_date)}
              </p>
              <p>
                <span className="text-muted-foreground">Working days:</span> {detail.working_day_count ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Excess days:</span> {detail.excess_days ?? 0}
              </p>
              {detail.reason ? (
                <p>
                  <span className="text-muted-foreground">Reason:</span> {detail.reason}
                </p>
              ) : null}
              {detail.supporting_document_url ? (
                <a
                  href={detail.supporting_document_url}
                  className="text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Supporting document
                </a>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust leave limit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Leave type (policy)</Label>
              <Select value={overridePolicyId} onValueChange={(v) => v != null && setOverridePolicyId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  {(settings.data?.policies ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custom limit (days)</Label>
              <Input value={overrideLimit} onChange={(e) => setOverrideLimit(e.target.value)} type="number" min={0} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOverrideOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!overrideUserId || !overridePolicyId) {
                  toast.error("Select policy");
                  return;
                }
                try {
                  await upsertOverride.mutateAsync({
                    user_id: overrideUserId,
                    policy_id: overridePolicyId,
                    custom_limit: Number(overrideLimit),
                  });
                  await overrides.refetch();
                  setOverrideOpen(false);
                  toast.success("Override saved");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyEditorRow({
  policy,
  onSave,
}: {
  policy: LeavePolicyRow;
  onSave: (p: {
    default_limit_days?: number | null;
    enforce_limit?: boolean;
    carry_forward_enabled?: boolean;
    carry_forward_max_days?: number | null;
  }) => Promise<void>;
}) {
  const [limit, setLimit] = useState(policy.default_limit_days == null ? "" : String(policy.default_limit_days));
  const [enforce, setEnforce] = useState(policy.enforce_limit);
  const [cf, setCf] = useState(policy.carry_forward_enabled);
  const [cfMax, setCfMax] = useState(policy.carry_forward_max_days == null ? "" : String(policy.carry_forward_max_days));

  return (
    <TableRow>
      <TableCell className="font-medium">{policy.display_name}</TableCell>
      <TableCell>
        <Input className="h-8 w-24" value={limit} onChange={(e) => setLimit(e.target.value)} />
      </TableCell>
      <TableCell>
        <Button type="button" size="sm" variant={enforce ? "default" : "secondary"} onClick={() => setEnforce(!enforce)}>
          {enforce ? "Yes" : "No"}
        </Button>
      </TableCell>
      <TableCell>
        <Button type="button" size="sm" variant={cf ? "default" : "secondary"} onClick={() => setCf(!cf)}>
          {cf ? "On" : "Off"}
        </Button>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="h-8 w-20" value={cfMax} onChange={(e) => setCfMax(e.target.value)} placeholder="Max" />
          <Button
            type="button"
            size="sm"
            onClick={() =>
              onSave({
                default_limit_days: limit === "" ? null : Number(limit),
                enforce_limit: enforce,
                carry_forward_enabled: cf,
                carry_forward_max_days: cfMax === "" ? null : Number(cfMax),
              })
            }
          >
            Save
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
