"use client";

import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InlineLoadingIndicator } from "@/components/ui/loading-indicator";
import { useEmployeeActivityQuery, useEmployeeOverviewQuery } from "@/lib/query/hooks";
import { EmployeeStatusBadge } from "./employee-status-badge";

type DetailTab = "overview" | "employment" | "leave" | "assets" | "payroll" | "advance" | "activity";

function fDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function initials(name?: string | null) {
  if (!name) return "-";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function EmployeeDetailSheet({
  open,
  onOpenChange,
  employeeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: string | null;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [activityPage, setActivityPage] = useState(1);
  const query = useEmployeeOverviewQuery(employeeId);
  const activityQuery = useEmployeeActivityQuery(
    employeeId,
    activityPage,
    20,
    open && activeTab === "activity",
  );

  const leaveRows = useMemo(
    () => (query.data?.leaves ?? []).map((leave) => ({
      id: leave.id,
      cells: [leave.type, fDate(leave.start_date), fDate(leave.end_date), leave.status],
    })),
    [query.data?.leaves],
  );

  const assetRows = useMemo(
    () => (query.data?.assets ?? []).map((asset) => ({
      id: asset.id,
      cells: [asset.name, asset.serial_no, asset.status, fDate(asset.assigned_at)],
    })),
    [query.data?.assets],
  );

  const payrollRows = useMemo(
    () => (query.data?.payroll ?? []).map((run) => ({
      id: run.id,
      cells: [
        `${String(run.month).padStart(2, "0")}/${run.year}`,
        run.is_locked ? "Finalized" : "Draft",
        run.lines?.[0]?.net_pay ?? "-",
      ],
    })),
    [query.data?.payroll],
  );

  const advanceRows = useMemo(
    () => (query.data?.advances ?? []).map((advance) => ({
      id: advance.id,
      cells: [
        advance.amount,
        advance.remaining_balance ?? "-",
        advance.is_cleared ? "Cleared" : "Open",
        fDate(advance.created_at),
      ],
    })),
    [query.data?.advances],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full min-w-3xl overflow-y-auto sm:max-w-3xl px-2">
        <SheetHeader>
          <SheetTitle>Employee Detail</SheetTitle>
        </SheetHeader>

        {query.isLoading ? (
          <div className="space-y-3 pt-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : !query.data ? (
          <p className="pt-4 text-sm text-muted-foreground">No data found.</p>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as DetailTab);
              if (value === "activity") {
                setActivityPage(1);
              }
            }}
            className="pt-4"
          >
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
              <TabsTrigger value="advance">Advance</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-22">
                      <AvatarImage
                        src={query.data.employee.avatar_url ?? "/images/user-default.avif"}
                        alt={query.data.employee.full_name}
                      />
                      <AvatarFallback>{initials(query.data.employee.full_name)}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-base">{query.data.employee.full_name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div>Email: {query.data.employee.email}</div>
                  <div>Employee ID: {query.data.employee.employee_data?.employee_code ?? "-"}</div>
                  <div>Department: {query.data.employee.employee_data?.department ?? "-"}</div>
                  <div>Position: {query.data.employee.employee_data?.designation ?? "-"}</div>
                  <div>Join date: {fDate(query.data.employee.employee_data?.joining_date)}</div>
                  <div><EmployeeStatusBadge status={query.data.employee.employment_status ?? "ACTIVE"} /></div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employment">
              <Card><CardContent className="grid grid-cols-1 gap-2 pt-6 text-sm md:grid-cols-2">
                <div>Employment type: {query.data.employee.employee_data?.employment_type ?? "-"}</div>
                <div>Contract end: {fDate(query.data.employee.employee_data?.contract_end_date)}</div>
                <div>Salary: {query.data.employee.employee_data?.salary_flat ?? "-"}</div>
                <div>Currency: {query.data.employee.employee_data?.currency ?? "-"}</div>
                <div>Passport: {query.data.employee.employee_data?.passport_number ?? "-"}</div>
                <div>Visa: {query.data.employee.employee_data?.visa_number ?? "-"}</div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="leave">
              {activeTab === "leave" ? <SimpleTable heads={["Type", "Start", "End", "Status"]} rows={leaveRows} /> : null}
            </TabsContent>

            <TabsContent value="assets">
              {activeTab === "assets" ? (
                <SimpleTable heads={["Asset", "Serial", "Status", "Assigned"]} rows={assetRows} />
              ) : null}
            </TabsContent>

            <TabsContent value="payroll">
              {activeTab === "payroll" ? <SimpleTable heads={["Period", "Status", "Net"]} rows={payrollRows} /> : null}
            </TabsContent>

            <TabsContent value="advance">
              {activeTab === "advance" ? (
                <SimpleTable heads={["Amount", "Remaining", "Status", "Date"]} rows={advanceRows} />
              ) : null}
            </TabsContent>

            <TabsContent value="activity">
              {activeTab === "activity" ? (
                <div className="space-y-3">
                  {activityQuery.isLoading ? (
                    <InlineLoadingIndicator label="Loading activity..." />
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>When</TableHead><TableHead>Actor</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(activityQuery.data?.items ?? []).map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell>
                              <div className="font-medium">{activity.action}</div>
                              {activity.details ? <div className="text-xs text-muted-foreground">{activity.details}</div> : null}
                            </TableCell>
                            <TableCell>{fDate(activity.timestamp)}</TableCell>
                            <TableCell>{activity.performer?.full_name ?? "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={(activityQuery.data?.meta?.page ?? activityPage) <= 1}
                      onClick={() => setActivityPage((prev) => Math.max(1, prev - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!activityQuery.data?.meta?.hasNext}
                      onClick={() => setActivityPage((prev) => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SimpleTable({ heads, rows }: { heads: string[]; rows: Array<{ id: string; cells: Array<string | number> }> }) {
  return (
    <Table>
      <TableHeader><TableRow>{heads.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>{row.cells.map((cell, idx) => <TableCell key={`${row.id}-${idx}`}>{cell}</TableCell>)}</TableRow>
        ))}
        {rows.length === 0 ? (
          <TableRow><TableCell colSpan={heads.length}><p className="p-4 text-sm text-muted-foreground">No records found.</p></TableCell></TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}
