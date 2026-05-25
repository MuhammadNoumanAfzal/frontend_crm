"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  BellRingIcon,
  CalendarClockIcon,
  FileUpIcon,
  FilterIcon,
  HistoryIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import type { VisaComputedStatus, VisaLifecycleStatus } from "@/lib/api/types";
import {
  useCancelVisaMutation,
  useRenewVisaMutation,
  useRunVisaMaintenanceMutation,
  useUpsertVisaProfileMutation,
  useUploadVisaDocumentMutation,
  useVisaExpiringQuery,
  useVisaHistoryQuery,
  useVisaListQuery,
  useVisaProfileQuery,
  useVisaRemindersQuery,
} from "@/lib/query/hooks";

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function toDateInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toIsoDateFromInput(value: string) {
  if (!value.trim()) return null;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function visaStatusBadge(status: VisaComputedStatus) {
  if (status === "EXPIRED") return <Badge variant="destructive">Expired</Badge>;
  if (status === "EXPIRING_30_DAYS") return <Badge variant="destructive">30d</Badge>;
  if (status === "EXPIRING_60_DAYS") return <Badge variant="secondary">60d</Badge>;
  if (status === "EXPIRING_90_DAYS") return <Badge variant="secondary">90d</Badge>;
  if (status === "RENEWAL_PENDING") return <Badge variant="secondary">Renewal Pending</Badge>;
  if (status === "CANCELLED") return <Badge variant="outline">Cancelled</Badge>;
  if (status === "MISSING") return <Badge variant="outline">Missing</Badge>;
  return <Badge>Valid</Badge>;
}

function lifecycleBadge(status: VisaLifecycleStatus) {
  if (status === "CANCELLED") return <Badge variant="outline">Cancelled</Badge>;
  if (status === "RENEWAL_PENDING") return <Badge variant="secondary">Renewal Pending</Badge>;
  return <Badge>Active</Badge>;
}

export default function AdminVisaPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VisaComputedStatus>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | VisaLifecycleStatus>("all");
  const [includeInactive, setIncludeInactive] = useState<"false" | "true">("false");

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [profileDraft, setProfileDraft] = useState<{
    passport_number?: string;
    passport_expiry?: string;
    visa_type?: string;
    visa_number?: string;
    visa_expiry?: string;
    work_permit_number?: string;
    sponsor_name?: string;
    renewal_due_date?: string;
    status?: VisaLifecycleStatus;
    notes?: string;
  }>({});

  const [renewDraft, setRenewDraft] = useState({
    new_visa_number: "",
    new_visa_expiry: "",
    new_visa_issue_date: "",
    notes: "",
  });

  const [cancelDraft, setCancelDraft] = useState({
    cancelled_at: "",
    cancellation_reason: "",
    notes: "",
  });

  const [documentDraft, setDocumentDraft] = useState({
    title: "",
    type: "visa_document",
    category: "VISA",
    expiry_date: "",
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const visaListQ = useVisaListQuery({
    page: 1,
    limit: 80,
    search: search.trim() || undefined,
    department: department.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    lifecycle_status: lifecycleFilter === "all" ? undefined : lifecycleFilter,
    include_inactive: includeInactive === "true",
  });

  const expiringQ = useVisaExpiringQuery({
    days: 30,
    include_expired: true,
    search: search.trim() || undefined,
    department: department.trim() || undefined,
    limit: 200,
  });

  const remindersQ = useVisaRemindersQuery({
    page: 1,
    limit: 100,
    status: "PENDING",
  });

  const rows = visaListQ.data?.rows ?? [];
  const summary = visaListQ.data?.summary;

  const resolvedSelectedUserId = useMemo(() => {
    if (rows.length === 0) return null;
    if (selectedUserId && rows.some((row) => row.employee_id === selectedUserId)) {
      return selectedUserId;
    }
    return rows[0].employee_id;
  }, [rows, selectedUserId]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.employee_id === resolvedSelectedUserId) ?? null,
    [rows, resolvedSelectedUserId],
  );

  const visaProfileQ = useVisaProfileQuery(resolvedSelectedUserId);
  const visaHistoryQ = useVisaHistoryQuery(resolvedSelectedUserId, { page: 1, limit: 12 });

  const upsertProfile = useUpsertVisaProfileMutation();
  const renewVisa = useRenewVisaMutation();
  const cancelVisa = useCancelVisaMutation();
  const uploadDocument = useUploadVisaDocumentMutation();
  const runMaintenance = useRunVisaMaintenanceMutation();

  const profile = visaProfileQ.data?.profile;

  const profilePassportNumber = profileDraft.passport_number ?? (profile?.passport_number ?? "");
  const profilePassportExpiry = profileDraft.passport_expiry ?? toDateInput(profile?.passport_expiry);
  const profileVisaType = profileDraft.visa_type ?? (profile?.visa_type ?? "");
  const profileVisaNumber = profileDraft.visa_number ?? (profile?.visa_number ?? "");
  const profileVisaExpiry = profileDraft.visa_expiry ?? toDateInput(profile?.visa_expiry);
  const profileWorkPermit = profileDraft.work_permit_number ?? (profile?.work_permit_number ?? "");
  const profileSponsor = profileDraft.sponsor_name ?? (profile?.sponsor_name ?? "");
  const profileRenewalDue = profileDraft.renewal_due_date ?? toDateInput(profile?.renewal_due_date);
  const profileStatus = profileDraft.status ?? (profile?.lifecycle_status ?? "ACTIVE");
  const profileNotes = profileDraft.notes ?? "";

  const disableProfileActions =
    upsertProfile.isPending ||
    renewVisa.isPending ||
    cancelVisa.isPending ||
    uploadDocument.isPending;

  const onSelectEmployee = (userId: string) => {
    setSelectedUserId(userId);
    setProfileDraft({});
    setRenewDraft({
      new_visa_number: "",
      new_visa_expiry: "",
      new_visa_issue_date: "",
      notes: "",
    });
    setCancelDraft({
      cancelled_at: "",
      cancellation_reason: "",
      notes: "",
    });
    setDocumentDraft({
      title: "",
      type: "visa_document",
      category: "VISA",
      expiry_date: "",
    });
    setDocumentFile(null);
  };

  const handleSaveProfile = async () => {
    if (!resolvedSelectedUserId) return;

    try {
      await upsertProfile.mutateAsync({
        userId: resolvedSelectedUserId,
        body: {
          passport_number: nullableText(profilePassportNumber),
          passport_expiry: toIsoDateFromInput(profilePassportExpiry),
          visa_type: nullableText(profileVisaType),
          visa_number: nullableText(profileVisaNumber),
          visa_expiry: toIsoDateFromInput(profileVisaExpiry),
          work_permit_number: nullableText(profileWorkPermit),
          sponsor_name: nullableText(profileSponsor),
          renewal_due_date: toIsoDateFromInput(profileRenewalDue),
          status: profileStatus,
          notes: nullableText(profileNotes),
        },
      });
      toast.success("Visa profile saved");
      setProfileDraft({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save visa profile");
    }
  };

  const handleRenewVisa = async () => {
    if (!resolvedSelectedUserId) return;
    if (!renewDraft.new_visa_expiry.trim()) {
      toast.error("New visa expiry date is required");
      return;
    }

    try {
      await renewVisa.mutateAsync({
        userId: resolvedSelectedUserId,
        body: {
          new_visa_expiry: toIsoDateFromInput(renewDraft.new_visa_expiry)!,
          new_visa_number: nullableText(renewDraft.new_visa_number),
          new_visa_issue_date: toIsoDateFromInput(renewDraft.new_visa_issue_date),
          notes: nullableText(renewDraft.notes),
        },
      });
      toast.success("Visa renewed");
      setRenewDraft({
        new_visa_number: "",
        new_visa_expiry: "",
        new_visa_issue_date: "",
        notes: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to renew visa");
    }
  };

  const handleCancelVisa = async () => {
    if (!resolvedSelectedUserId) return;
    if (!cancelDraft.cancellation_reason.trim()) {
      toast.error("Cancellation reason is required");
      return;
    }

    try {
      await cancelVisa.mutateAsync({
        userId: resolvedSelectedUserId,
        body: {
          cancelled_at: toIsoDateFromInput(cancelDraft.cancelled_at),
          cancellation_reason: cancelDraft.cancellation_reason.trim(),
          notes: nullableText(cancelDraft.notes),
        },
      });
      toast.success("Visa cancelled");
      setCancelDraft({
        cancelled_at: "",
        cancellation_reason: "",
        notes: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel visa");
    }
  };

  const handleUploadDocument = async () => {
    if (!resolvedSelectedUserId) return;
    if (!documentFile) {
      toast.error("Please choose a document file");
      return;
    }
    if (!documentDraft.title.trim() || !documentDraft.type.trim()) {
      toast.error("Document title and type are required");
      return;
    }

    try {
      await uploadDocument.mutateAsync({
        userId: resolvedSelectedUserId,
        file: documentFile,
        body: {
          title: documentDraft.title.trim(),
          type: documentDraft.type.trim(),
          category: documentDraft.category.trim() || undefined,
          expiry_date: toIsoDateFromInput(documentDraft.expiry_date),
        },
      });
      toast.success("Visa document uploaded");
      setDocumentFile(null);
      setDocumentDraft({
        title: "",
        type: "visa_document",
        category: "VISA",
        expiry_date: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload visa document");
    }
  };

  const handleRunMaintenance = async () => {
    try {
      const payload = await runMaintenance.mutateAsync();
      toast.success(
        `Maintenance done: ${payload.backfill.created} backfilled, ${payload.scheduled.scheduled} reminders scheduled, ${payload.processed.sent} reminders processed`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run maintenance");
    }
  };

  if (visaListQ.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visa & Compliance Studio</h1>
          <p className="text-sm text-muted-foreground">
            Live visa operations dashboard with renewal, cancellation, reminders, and document linkage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => visaListQ.refetch()}>
            <RefreshCwIcon className="mr-2 size-4" />
            Refresh
          </Button>
          <Button type="button" variant="secondary" onClick={handleRunMaintenance} disabled={runMaintenance.isPending}>
            <BellRingIcon className="mr-2 size-4" />
            Run Maintenance
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Compliance Rate"
          value={`${(summary?.compliance_rate ?? 0).toFixed(2)}%`}
          icon={ShieldCheckIcon}
          tone="success"
        />
        <StatCard title="Expired" value={summary?.expired ?? 0} icon={ShieldAlertIcon} tone="danger" />
        <StatCard
          title="Expiring in 30 Days"
          value={summary?.expiring_30_days ?? 0}
          icon={CalendarClockIcon}
          tone="warning"
        />
        <StatCard
          title="Pending Reminders"
          value={remindersQ.data?.items.length ?? 0}
          hint={`${expiringQ.data?.summary.total_matches ?? 0} risky records`}
          icon={BellRingIcon}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FilterIcon className="size-4" />
            Filter Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="visa-search">Search</Label>
            <Input
              id="visa-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, visa number"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="visa-department">Department</Label>
            <Input
              id="visa-department"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Department"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="visa-compliance-status">Compliance status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => value != null && setStatusFilter(value as "all" | VisaComputedStatus)}
            >
              <SelectTrigger id="visa-compliance-status">
                <SelectValue placeholder="Compliance status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="VALID">Valid</SelectItem>
                <SelectItem value="EXPIRING_30_DAYS">Expiring in 30 days</SelectItem>
                <SelectItem value="EXPIRING_60_DAYS">Expiring in 60 days</SelectItem>
                <SelectItem value="EXPIRING_90_DAYS">Expiring in 90 days</SelectItem>
                <SelectItem value="RENEWAL_PENDING">Renewal pending</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="MISSING">Missing</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="visa-lifecycle-status">Lifecycle status</Label>
            <Select
              value={lifecycleFilter}
              onValueChange={(value) => value != null && setLifecycleFilter(value as "all" | VisaLifecycleStatus)}
            >
              <SelectTrigger id="visa-lifecycle-status">
                <SelectValue placeholder="Lifecycle status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All lifecycle states</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="RENEWAL_PENDING">Renewal pending</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="visa-employee-scope">Employee scope</Label>
            <Select value={includeInactive} onValueChange={(value) => value != null && setIncludeInactive(value as "false" | "true")}>
              <SelectTrigger id="visa-employee-scope">
                <SelectValue placeholder="Employee scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Active only</SelectItem>
                <SelectItem value="true">Include inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Employees ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[640px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Visa Number</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lifecycle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const selected = row.employee_id === resolvedSelectedUserId;

                    return (
                      <TableRow
                        key={row.employee_id}
                        className={selected ? "bg-primary/5" : "cursor-pointer"}
                        onClick={() => onSelectEmployee(row.employee_id)}
                      >
                        <TableCell>
                          <div className="font-medium">{row.full_name}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell>{row.visa_number ?? "-"}</TableCell>
                        <TableCell>
                          <div className="tabular-nums">{formatDate(row.visa_expiry)}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.days_to_expiry == null ? "-" : `${row.days_to_expiry} day(s)`}
                          </div>
                        </TableCell>
                        <TableCell>{visaStatusBadge(row.status)}</TableCell>
                        <TableCell>{lifecycleBadge(row.lifecycle_status)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No visa records match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Selected Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedRow ? (
              <p className="text-sm text-muted-foreground">Select an employee from the left table to manage visa data.</p>
            ) : null}

            {selectedRow && visaProfileQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading profile details...</p>
            ) : null}

            {selectedRow && !visaProfileQ.isLoading ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{visaProfileQ.data?.employee.full_name ?? selectedRow.full_name}</p>
                      <p className="text-xs text-muted-foreground">{visaProfileQ.data?.employee.email ?? selectedRow.email}</p>
                    </div>
                    {visaProfileQ.data?.profile ? visaStatusBadge(visaProfileQ.data.profile.status) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Passport Number</Label>
                    <Input
                      value={profilePassportNumber}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          passport_number: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Passport Expiry</Label>
                    <DatePicker
                      value={profilePassportExpiry}
                      onChange={(value) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          passport_expiry: value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Visa Type</Label>
                    <Input
                      value={profileVisaType}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          visa_type: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Visa Number</Label>
                    <Input
                      value={profileVisaNumber}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          visa_number: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Visa Expiry</Label>
                    <DatePicker
                      value={profileVisaExpiry}
                      onChange={(value) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          visa_expiry: value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Work Permit Number</Label>
                    <Input
                      value={profileWorkPermit}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          work_permit_number: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Sponsor Name</Label>
                    <Input
                      value={profileSponsor}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          sponsor_name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Renewal Due Date</Label>
                    <DatePicker
                      value={profileRenewalDue}
                      onChange={(value) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          renewal_due_date: value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Lifecycle Status</Label>
                    <Select
                      value={profileStatus}
                      onValueChange={(value) =>
                        value != null &&
                        setProfileDraft((prev) => ({
                          ...prev,
                          status: value as VisaLifecycleStatus,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="RENEWAL_PENDING">Renewal Pending</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={profileNotes}
                      onChange={(event) =>
                        setProfileDraft((prev) => ({
                          ...prev,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Optional notes"
                      className="min-h-20"
                    />
                  </div>
                </div>

                <Button type="button" onClick={handleSaveProfile} disabled={disableProfileActions}>
                  <ShieldCheckIcon className="mr-2 size-4" />
                  Save Profile
                </Button>

                <div className="grid gap-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Renew Visa</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="New visa number (optional)"
                      value={renewDraft.new_visa_number}
                      onChange={(event) =>
                        setRenewDraft((prev) => ({
                          ...prev,
                          new_visa_number: event.target.value,
                        }))
                      }
                    />
                    <DatePicker
                      value={renewDraft.new_visa_expiry}
                      onChange={(value) =>
                        setRenewDraft((prev) => ({
                          ...prev,
                          new_visa_expiry: value,
                        }))
                      }
                    />
                    <DatePicker
                      value={renewDraft.new_visa_issue_date}
                      onChange={(value) =>
                        setRenewDraft((prev) => ({
                          ...prev,
                          new_visa_issue_date: value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Renewal note"
                      value={renewDraft.notes}
                      onChange={(event) =>
                        setRenewDraft((prev) => ({
                          ...prev,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={handleRenewVisa} disabled={disableProfileActions}>
                    <CalendarClockIcon className="mr-2 size-4" />
                    Renew
                  </Button>
                </div>

                <div className="grid gap-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Cancel Visa</p>
                  <DatePicker
                    value={cancelDraft.cancelled_at}
                    onChange={(value) =>
                      setCancelDraft((prev) => ({
                        ...prev,
                        cancelled_at: value,
                      }))
                    }
                  />
                  <Input
                    placeholder="Cancellation reason"
                    value={cancelDraft.cancellation_reason}
                    onChange={(event) =>
                      setCancelDraft((prev) => ({
                        ...prev,
                        cancellation_reason: event.target.value,
                      }))
                    }
                  />
                  <Textarea
                    placeholder="Optional note"
                    value={cancelDraft.notes}
                    onChange={(event) =>
                      setCancelDraft((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                  />
                  <Button type="button" variant="destructive" onClick={handleCancelVisa} disabled={disableProfileActions}>
                    <AlertTriangleIcon className="mr-2 size-4" />
                    Cancel Visa
                  </Button>
                </div>

                <div className="grid gap-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Upload Visa Document</p>
                  <Input
                    placeholder="Document title"
                    value={documentDraft.title}
                    onChange={(event) =>
                      setDocumentDraft((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Type"
                      value={documentDraft.type}
                      onChange={(event) =>
                        setDocumentDraft((prev) => ({
                          ...prev,
                          type: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Category"
                      value={documentDraft.category}
                      onChange={(event) =>
                        setDocumentDraft((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <DatePicker
                    value={documentDraft.expiry_date}
                    onChange={(value) =>
                      setDocumentDraft((prev) => ({
                        ...prev,
                        expiry_date: value,
                      }))
                    }
                  />
                  <Input
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setDocumentFile(file);
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleUploadDocument} disabled={disableProfileActions}>
                    <FileUpIcon className="mr-2 size-4" />
                    Upload Document
                  </Button>

                  {(visaProfileQ.data?.documents.length ?? 0) > 0 ? (
                    <div className="space-y-1 rounded-md border p-2">
                      <p className="text-xs font-medium text-muted-foreground">Linked Documents</p>
                      {(visaProfileQ.data?.documents ?? []).slice(0, 5).map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.document.secure_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-xs text-primary hover:underline"
                        >
                          {doc.document.title} ({doc.document.type})
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2 rounded-lg border p-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <HistoryIcon className="size-4" />
                    Recent History
                  </p>
                  <div className="max-h-44 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>By</TableHead>
                          <TableHead>When</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(visaHistoryQ.data?.items ?? []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.action}</TableCell>
                            <TableCell>{item.performer?.full_name ?? "System"}</TableCell>
                            <TableCell>{formatDate(item.created_at)}</TableCell>
                          </TableRow>
                        ))}
                        {(visaHistoryQ.data?.items.length ?? 0) === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                              No history records yet.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

