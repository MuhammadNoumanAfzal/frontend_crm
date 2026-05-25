"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCompleteOffboardingMutation,
  useCreateOffboardingCaseMutation,
  useEmployeesQuery,
  useOffboardingCaseQuery,
  useOffboardingCasesQuery,
  useOffboardingStatsQuery,
  useUpdateOffboardingAssetReturnMutation,
  useUpdateOffboardingTaskMutation,
  useUpdateOffboardingVisaMutation,
} from "@/lib/query/hooks";
import type { OffboardingCase } from "@/lib/api/types";
import { ArchiveIcon, CheckCircle2Icon, ListChecksIcon, UserMinusIcon } from "lucide-react";

const TASK_STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "NOT_APPLICABLE"] as const;
const ASSET_STATUS_OPTIONS = ["PENDING", "RETURNED", "NOT_APPLICABLE"] as const;
const VISA_STATUS_OPTIONS = ["NOT_REQUIRED", "PENDING", "IN_PROGRESS", "COMPLETED"] as const;

type OffboardingTab = "active" | "completed" | "archived";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

export default function AdminOffboardingPage() {
  const [tab, setTab] = useState<OffboardingTab>("active");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [documentsNote, setDocumentsNote] = useState("");

  const [assetNotes, setAssetNotes] = useState<Record<string, string>>({});

  const statsQuery = useOffboardingStatsQuery();
  const casesQuery = useOffboardingCasesQuery({
    tab,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: search || undefined,
    page,
    limit: 20,
  });
  const caseRows = useMemo(() => casesQuery.data?.items ?? [], [casesQuery.data?.items]);
  const resolvedCaseId = useMemo(() => {
    if (caseRows.length === 0) return null;
    if (selectedCaseId && caseRows.some((item) => item.id === selectedCaseId)) {
      return selectedCaseId;
    }
    return caseRows[0].id;
  }, [caseRows, selectedCaseId]);

  const detailQuery = useOffboardingCaseQuery(resolvedCaseId);

  const employeesQuery = useEmployeesQuery({
    page: 1,
    limit: 200,
    is_active: true,
  });

  const createCase = useCreateOffboardingCaseMutation();
  const updateTask = useUpdateOffboardingTaskMutation();
  const updateAsset = useUpdateOffboardingAssetReturnMutation();
  const updateVisa = useUpdateOffboardingVisaMutation();
  const completeCase = useCompleteOffboardingMutation();

  const selectedCase = detailQuery.data;

  if (statsQuery.isLoading || casesQuery.isLoading) {
    return <PageSkeleton />;
  }

  const handleCreateCase = async () => {
    if (!employeeId) {
      toast.error("Select an employee");
      return;
    }

    if (!effectiveDate) {
      toast.error("Effective date is required");
      return;
    }

    try {
      const created = await createCase.mutateAsync({
        user_id: employeeId,
        effective_date: toIsoDate(effectiveDate),
        reason_code: reasonCode || undefined,
        reason_detail: reasonDetail || undefined,
        documents_note: documentsNote || undefined,
      });

      setSelectedCaseId(created.id);
      setEmployeeId("");
      setEffectiveDate("");
      setReasonCode("");
      setReasonDetail("");
      setDocumentsNote("");
      toast.success("Offboarding case initiated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create offboarding case");
    }
  };

  const handleTaskStatusChange = async (
    taskId: string,
    status: (typeof TASK_STATUS_OPTIONS)[number],
  ) => {
    if (!resolvedCaseId) return;

    try {
      await updateTask.mutateAsync({ caseId: resolvedCaseId, taskId, status });
      toast.success("Task status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update task");
    }
  };

  const handleAssetStatusChange = async (
    assetReturnId: string,
    status: (typeof ASSET_STATUS_OPTIONS)[number],
  ) => {
    if (!resolvedCaseId) return;

    try {
      await updateAsset.mutateAsync({
        caseId: resolvedCaseId,
        assetReturnId,
        status,
        notes: assetNotes[assetReturnId] ?? null,
      });
      toast.success("Asset return updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update asset return");
    }
  };

  const handleVisaUpdate = async (body: {
    is_applicable: boolean;
    status: (typeof VISA_STATUS_OPTIONS)[number];
    notes: string | null;
  }) => {
    if (!resolvedCaseId) return;

    try {
      await updateVisa.mutateAsync({
        caseId: resolvedCaseId,
        body,
      });
      toast.success("Visa details updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update visa details");
    }
  };

  const handleComplete = async () => {
    if (!resolvedCaseId) return;

    try {
      await completeCase.mutateAsync(resolvedCaseId);
      toast.success("Offboarding completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to complete offboarding");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offboarding</h1>
        <p className="text-sm text-muted-foreground">
          Manage employee offboarding cases, clearances, and completion.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Cases" value={statsQuery.data?.active_cases ?? 0} icon={UserMinusIcon} />
        <StatCard
          title="Completed This Month"
          value={statsQuery.data?.completed_this_month ?? 0}
          icon={CheckCircle2Icon}
          tone="success"
        />
        <StatCard
          title="Pending Actions"
          value={statsQuery.data?.pending_actions ?? 0}
          icon={ListChecksIcon}
          tone="warning"
        />
        <StatCard title="Archive Ready" value={statsQuery.data?.archive_ready ?? 0} icon={ArchiveIcon} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Initiate Offboarding</CardTitle>
          <CardDescription>Create a new offboarding case for an employee.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={(value) => setEmployeeId(value ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(employeesQuery.data?.data ?? []).map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name} ({employee.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Effective Date</Label>
            <DatePicker value={effectiveDate} onChange={setEffectiveDate} />
          </div>

          <div className="space-y-2">
            <Label>Reason Code (optional)</Label>
            <Input
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
              placeholder="RESIGNATION"
            />
          </div>

          <div className="space-y-2">
            <Label>Reason Detail (optional)</Label>
            <Input
              value={reasonDetail}
              onChange={(event) => setReasonDetail(event.target.value)}
              placeholder="Employee resignation notice"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Document Note (optional)</Label>
            <Textarea
              value={documentsNote}
              onChange={(event) => setDocumentsNote(event.target.value)}
              placeholder="Additional documentation instructions"
            />
          </div>

          <div className="md:col-span-2">
            <Button
              type="button"
              onClick={() => void handleCreateCase()}
              disabled={createCase.isPending}
            >
              Create Offboarding Case
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Cases</CardTitle>
            <Tabs
              value={tab}
              onValueChange={(value) => {
                setTab(value as OffboardingTab);
                setPage(1);
              }}
            >
              <TabsList className="w-full justify-start">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="offboarding-case-search">Search</Label>
                <Input
                  id="offboarding-case-search"
                  placeholder="Search by employee"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="offboarding-case-status">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value ?? "ALL");
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="offboarding-case-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="INITIATED">Initiated</SelectItem>
                    <SelectItem value="ASSETS_PENDING">Assets Pending</SelectItem>
                    <SelectItem value="CLEARANCE_PENDING">Clearance Pending</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caseRows.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      data-state={resolvedCaseId === item.id ? "selected" : undefined}
                      onClick={() => setSelectedCaseId(item.id)}
                    >
                      <TableCell>
                        <p className="font-medium">{item.user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{item.user.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.effective_date)}</TableCell>
                    </TableRow>
                  ))}

                  {caseRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        No offboarding cases found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {casesQuery.data?.meta?.page ?? page} of {casesQuery.data?.meta?.totalPages ?? 1}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={(casesQuery.data?.meta?.page ?? page) <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!casesQuery.data?.meta?.hasNext}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {resolvedCaseId && detailQuery.isLoading ? <PageSkeleton /> : null}

            {!selectedCase ? (
              <p className="text-sm text-muted-foreground">Select a case to view details.</p>
            ) : (
              <>
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{selectedCase.user.full_name}</p>
                    <Badge>{selectedCase.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Effective date: {formatDate(selectedCase.effective_date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Progress: {selectedCase.progress.required_tasks_completed}/
                    {selectedCase.progress.required_tasks_total} required tasks, {selectedCase.progress.assets_completed}/
                    {selectedCase.progress.assets_total} assets
                  </p>

                  {selectedCase.completion_blockers.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700 dark:text-amber-400">
                      {selectedCase.completion_blockers.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">Case is ready to complete.</p>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleComplete()}
                    disabled={!selectedCase.can_complete || completeCase.isPending}
                  >
                    Complete Offboarding
                  </Button>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium">Checklist</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Required</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCase.offboarding_tasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{task.code.replace(/_/g, " ")}</p>
                            </TableCell>
                            <TableCell>{task.is_required ? "Yes" : "No"}</TableCell>
                            <TableCell>
                              <Select
                                value={task.status}
                                onValueChange={(value) =>
                                  void handleTaskStatusChange(task.id, value as (typeof TASK_STATUS_OPTIONS)[number])
                                }
                                disabled={selectedCase.status === "COMPLETED" || updateTask.isPending}
                              >
                                <SelectTrigger className="w-[210px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TASK_STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status.replace(/_/g, " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium">Asset Returns</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCase.asset_returns.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="font-medium">{item.asset.name}</p>
                              <p className="text-xs text-muted-foreground">{item.asset.serial_no}</p>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.status}
                                onValueChange={(value) =>
                                  void handleAssetStatusChange(item.id, value as (typeof ASSET_STATUS_OPTIONS)[number])
                                }
                                disabled={selectedCase.status === "COMPLETED" || updateAsset.isPending}
                              >
                                <SelectTrigger className="w-[210px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ASSET_STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status.replace(/_/g, " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={assetNotes[item.id] ?? item.notes ?? ""}
                                onChange={(event) =>
                                  setAssetNotes((prev) => ({ ...prev, [item.id]: event.target.value }))
                                }
                                placeholder="Notes"
                                disabled={selectedCase.status === "COMPLETED"}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <VisaEditor
                  key={selectedCase.id}
                  selectedCase={selectedCase}
                  disabled={selectedCase.status === "COMPLETED"}
                  isPending={updateVisa.isPending}
                  onSave={handleVisaUpdate}
                />

                <div>
                  <h3 className="mb-2 text-sm font-medium">Documents</h3>
                  <div className="space-y-2">
                    {selectedCase.documents.length === 0 ? (
                      <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                        No documents uploaded yet.
                      </p>
                    ) : (
                      selectedCase.documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.secure_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40"
                        >
                          <span>{doc.title}</span>
                          <span className="text-xs text-muted-foreground">{doc.type}</span>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VisaEditor({
  selectedCase,
  disabled,
  isPending,
  onSave,
}: {
  selectedCase: OffboardingCase;
  disabled: boolean;
  isPending: boolean;
  onSave: (body: {
    is_applicable: boolean;
    status: (typeof VISA_STATUS_OPTIONS)[number];
    notes: string | null;
  }) => Promise<void>;
}) {
  const [isApplicable, setIsApplicable] = useState(
    selectedCase.visa_cancellation?.is_applicable ?? false,
  );
  const [status, setStatus] = useState<(typeof VISA_STATUS_OPTIONS)[number]>(
    selectedCase.visa_cancellation?.status ?? "NOT_REQUIRED",
  );
  const [notes, setNotes] = useState(selectedCase.visa_cancellation?.notes ?? "");

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <h3 className="text-sm font-medium">Visa Cancellation</h3>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isApplicable}
          onChange={(event) => setIsApplicable(event.target.checked)}
          disabled={disabled}
        />
        Applicable
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <Select
          value={status}
          onValueChange={(value) => setStatus((value ?? "NOT_REQUIRED") as (typeof VISA_STATUS_OPTIONS)[number])}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISA_STATUS_OPTIONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Visa notes"
          disabled={disabled}
        />
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => void onSave({ is_applicable: isApplicable, status, notes: notes || null })}
        disabled={disabled || isPending}
      >
        Save Visa Details
      </Button>
    </div>
  );
}
