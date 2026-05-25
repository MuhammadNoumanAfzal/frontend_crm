"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDownIcon, DownloadIcon, EyeIcon, PencilIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useBitrixSyncMutation,
  useBitrixSyncStatusQuery,
  useEmployeesQuery,
} from "@/lib/query/hooks";
import { EmployeeStatusBadge } from "@/components/employees/employee-status-badge";
import { BitrixSyncBadge } from "@/components/employees/bitrix-sync-badge";

const EmployeeDetailSheet = dynamic(
  () => import("@/components/employees/employee-detail-sheet").then((mod) => mod.EmployeeDetailSheet),
  { ssr: false },
);

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [employmentStatus, setEmploymentStatus] = useState("ALL");
  const [employmentType, setEmploymentType] = useState("ALL");
  const [sortBy, setSortBy] = useState<"name" | "join_date" | "status">("join_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const bitrixStatus = useBitrixSyncStatusQuery();
  const bitrixSync = useBitrixSyncMutation();
  const employees = useEmployeesQuery({
    search: search || undefined,
    department: department === "ALL" ? undefined : department,
    employment_status: employmentStatus === "ALL" ? undefined : employmentStatus,
    employment_type: employmentType === "ALL" ? undefined : employmentType,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    limit,
  });

  const rows = useMemo(() => employees.data?.data ?? [], [employees.data]);
  const meta = employees.data?.meta;
  const departments = useMemo(
    () => Array.from(new Set((rows ?? []).map((e) => e.employee_data?.department).filter(Boolean))) as string[],
    [rows]
  );
  const allSelectedOnPage = rows.length > 0 && rows.every((r) => selected[r.id]);
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const openDetail = useCallback((employeeId: string) => {
    setDetailEmployeeId(employeeId);
    setDetailOpen(true);
  }, []);

  const goToEdit = useCallback(
    (employeeId: string) => {
      router.push(`/admin/employees/${employeeId}/edit`);
    },
    [router],
  );

  const exportSelected = () => {
    const selectedRows = rows.filter((r) => selected[r.id]);
    if (!selectedRows.length) {
      toast.error("Select at least one employee");
      return;
    }
    const csvRows = selectedRows.map((r) => ({
      name: r.full_name,
      employee_id: r.employee_data?.employee_code ?? "",
      department: r.employee_data?.department ?? "",
      position: r.employee_data?.designation ?? "",
      employment_type: r.employee_data?.employment_type ?? "",
      status: r.employment_status ?? "",
      joined: r.employee_data?.joining_date ?? "",
      email: r.email,
    }));
    const headers = Object.keys(csvRows[0]);
    const csv = [
      headers.join(","),
      ...csvRows.map((row) =>
        headers.map((h) => `"${String(row[h as keyof typeof row] ?? "").replaceAll(`"`, `""`)}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (employees.isLoading) return <PageSkeleton />;

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">Employees</CardTitle>
              <p className="text-sm text-muted-foreground">Manage your team — {meta?.total ?? rows.length} total</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const result = await bitrixSync.mutateAsync();
                    if (!result.enabled) {
                      toast.error("Bitrix sync is disabled in environment settings");
                    } else if (!result.configured) {
                      toast.error("Bitrix webhook is not configured. Set BITRIX_WEBHOOK_URL and retry.");
                    } else {
                      toast.success("Bitrix sync completed");
                      await employees.refetch();
                    }
                    await bitrixStatus.refetch();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Sync failed");
                  }
                }}
                disabled={bitrixSync.isPending}
              >
                <RefreshCwIcon className={`size-4 ${bitrixSync.isPending ? "animate-spin" : ""}`} />
                Sync Bitrix24
              </Button>
              <Button type="button" onClick={() => router.push("/admin/employees/new")}>
                <PlusIcon className="size-4" />
                Add Employee
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="employee-search">Search</Label>
              <Input
                id="employee-search"
                placeholder="Name, email or employee ID"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="employee-department">Department</Label>
              <Select value={department} onValueChange={(v) => { setDepartment(v ?? "ALL"); setPage(1); }}>
                <SelectTrigger id="employee-department"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All departments</SelectItem>
                  {departments.map((dep) => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="employee-status">Status</Label>
              <Select value={employmentStatus} onValueChange={(v) => { setEmploymentStatus(v ?? "ALL"); setPage(1); }}>
                <SelectTrigger id="employee-status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ONBOARDING">Probation</SelectItem>
                  <SelectItem value="CANDIDATE">Candidate</SelectItem>
                  <SelectItem value="TERMINATING">Terminating</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="employee-type">Employment type</Label>
              <Select value={employmentType} onValueChange={(v) => { setEmploymentType(v ?? "ALL"); setPage(1); }}>
                <SelectTrigger id="employee-type"><SelectValue placeholder="Employment type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="FULL_TIME">Full-time</SelectItem>
                  <SelectItem value="PART_TIME">Part-time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="employee-sort">Sort</Label>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "join_date" | "status")}>
                  <SelectTrigger id="employee-sort"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="join_date">Join date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}>
                  <ArrowUpDownIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-2">
            <div className="text-xs text-muted-foreground">
              {selectedIds.length} selected
              {bitrixStatus.data ? ` · Last sync ${new Date(bitrixStatus.data.timestamp).toLocaleString()}` : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={exportSelected}>
                <DownloadIcon className="size-4" />
                Export
              </Button>
              <Button type="button" size="sm" variant="destructive" disabled title="Disabled: use Offboarding workflow">
                Bulk Terminate Disabled
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={(e) => {
                      const next = { ...selected };
                      if (e.target.checked) rows.forEach((r) => { next[r.id] = true; });
                      else rows.forEach((r) => { next[r.id] = false; });
                      setSelected(next);
                    }}
                  />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="hidden lg:table-cell">Bitrix sync</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((employee) => (
                <TableRow key={employee.id} className="cursor-pointer" onClick={() => openDetail(employee.id)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={Boolean(selected[employee.id])}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [employee.id]: e.target.checked }))}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={employee.avatar_url ?? "/images/user-default.avif"} alt={employee.full_name} />
                        <AvatarFallback>{getInitials(employee.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div>{employee.full_name}</div>
                        <div className="text-xs text-muted-foreground">{employee.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.employee_data?.employee_code ?? "-"}</TableCell>
                  <TableCell>{employee.employee_data?.department ?? "-"}</TableCell>
                  <TableCell>{employee.employee_data?.designation ?? "-"}</TableCell>
                  <TableCell>{employee.employee_data?.employment_type?.replace("_", "-") ?? "-"}</TableCell>
                  <TableCell>
                    <EmployeeStatusBadge status={employee.employment_status ?? (employee.is_active ? "ACTIVE" : "TERMINATED")} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {employee.employee_data?.joining_date ? new Date(employee.employee_data.joining_date).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <BitrixSyncBadge bitrixId={employee.bitrix_id} lastPulledAt={employee.bitrix_last_pulled_at} locked={employee.manual_bitrix_sync_lock} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button size="icon-sm" variant="outline" type="button" onClick={() => openDetail(employee.id)} />
                          }
                        >
                          <EyeIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button size="icon-sm" variant="outline" type="button" onClick={() => goToEdit(employee.id)} />
                          }
                        >
                          <PencilIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}><p className="p-6 text-sm text-muted-foreground">No employees found for your filters.</p></TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Page {meta?.page ?? page} of {meta?.totalPages ?? 1}</div>
            <div className="flex items-center gap-2">
              <div className="space-y-1">
                <Label htmlFor="employee-limit" className="text-xs">Rows</Label>
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger id="employee-limit" className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" disabled={(meta?.page ?? page) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <Button size="sm" variant="outline" disabled={!meta?.hasNext} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <EmployeeDetailSheet open={detailOpen} onOpenChange={setDetailOpen} employeeId={detailEmployeeId} />
    </>
  );
}
