"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiRequestBlob } from "@/lib/api/client";
import type {
  ApiEnvelope,
  AdminDashboardPayload,
  AdvancePaymentItem,
  Asset,
  AssetAssignment,
  AssetCategory,
  AssetCondition,
  AssetDocument,
  AssetMetrics,
  AssetStatus,
  BitrixSyncStatus,
  DocumentItem,
  EmployeeDocumentDownloadPayload,
  EmployeeDashboardPayload,
  EmploymentStatus,
  EmploymentType,
  EmployeeOverview,
  EmployeeRow,
  LeaveAdminStats,
  LeaveCalendarEvent,
  LeaveOverrideRow,
  LeavePreviewResult,
  LeaveRequest,
  LeaveSettingsResponse,
  PublicHolidayRow,
  OffboardingCase,
  OffboardingStats,
  PayrollLine,
  PayrollLineStatus,
  PayrollMySummary,
  PayrollRunHistoryItem,
  PayrollRunStatus,
  PayrollStats,
  PayrollRun,
  ReportExportFormat,
  ReportTab,
  ReportsHeadcount,
  ReportsLeave,
  ReportsOverview,
  ReportsPayroll,
  ReportsTurnover,
  ReportsVisa,
  VisaComputedStatus,
  VisaExpiringPayload,
  VisaHistoryItem,
  VisaLifecycleStatus,
  VisaListPayload,
  VisaProfileDetailPayload,
  VisaReminderItem,
  RecruitmentCandidate,
  RecruitmentMeResponse,
  RecruitmentOverview,
  RecruitmentStage,
  RecruitmentStats,
  FeedbackAdminItem,
  FeedbackAnalyticsPayload,
  FeedbackCategory,
  FeedbackEmployeeItem,
  FeedbackSentiment,
  FeedbackStatus,
  SettingsAggregatePayload,
  SettingsBitrixConfig,
  SettingsBitrixWebhookTestResult,
  SettingsCompanyInfo,
  SettingsNotificationDefaults,
  SettingsRoleUser,
  SettingsRolesPayload,
  User,
} from "@/lib/api/types";
import { clearToken, getToken } from "@/lib/auth/session";

type PaginationParams = { page?: number; limit?: number };

type LeaveBalanceEntry = {
  limitDays: number | null;
  defaultLimitDays: number | null;
  isCustomLimit: boolean;
  usedApprovedDays: number;
  pendingDays: number;
  remainingDays: number | null;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
};
type LeaveBalanceByType = Record<string, LeaveBalanceEntry>;

function withPagination(query: PaginationParams | undefined) {
  const page = query?.page ?? 1;
  const limit = query?.limit ?? 20;
  return { page, limit };
}

function toQueryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function useMeQuery() {
  return useQuery({
    queryKey: ["me"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<User>("/auth/me");
      return payload.data;
    },
  });
}

export function useAdminDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard-admin"],
    enabled: Boolean(getToken()),
    staleTime: 300_000,
    queryFn: async () => {
      const payload = await apiRequest<AdminDashboardPayload>("/dashboard/admin");
      return payload.data;
    },
  });
}

export function useEmployeeDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard-employee"],
    enabled: Boolean(getToken()),
    staleTime: 300_000,
    queryFn: async () => {
      const payload = await apiRequest<EmployeeDashboardPayload>("/dashboard/employee");
      return payload.data;
    },
  });
}

export function useLoginMutation() {
  type LoginInput = { email: string; password: string };
  type LoginResult = { user: User; token: string };

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const payload = await apiRequest<LoginResult>("/auth/login", {
        method: "POST",
        body: input,
      });
      return payload.data;
    },
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      await apiRequest<null>("/auth/logout", { method: "POST" });
      clearToken();
      return null;
    },
  });
}

export function useEmployeesQuery(
  filters?: {
    department?: string;
    is_active?: boolean;
    search?: string;
    employment_status?: string;
    employment_type?: string;
    sort_by?: "name" | "join_date" | "status";
    sort_order?: "asc" | "desc";
  } & PaginationParams,
) {
  const { page, limit } = withPagination(filters);

  return useQuery({
    queryKey: [
      "employees",
      {
        page,
        limit,
        department: filters?.department,
        is_active: filters?.is_active,
        search: filters?.search,
        employment_status: filters?.employment_status,
        employment_type: filters?.employment_type,
        sort_by: filters?.sort_by,
        sort_order: filters?.sort_order,
      },
    ],
    enabled: Boolean(getToken()),
    staleTime: 300_000,
    queryFn: async () => {
      const queryString = toQueryString({
        page,
        limit,
        department: filters?.department,
        is_active: filters?.is_active,
        search: filters?.search,
        employment_status: filters?.employment_status,
        employment_type: filters?.employment_type,
        sort_by: filters?.sort_by,
        sort_order: filters?.sort_order,
      });

      const payload = await apiRequest<EmployeeRow[]>(`/employees${queryString}`);
      return { data: payload.data, meta: payload.meta };
    },
  });
}

export function useCreateEmployeeMutation() {
  type CreateEmployeeInput = {
    full_name: string;
    email: string;
    password: string;
    employee_code?: string;
    bitrix_id?: string;
    department?: string;
    designation?: string;
    employment_type?: "FULL_TIME" | "PART_TIME" | "CONTRACT";
    contract_end_date?: string;
    currency?: string;
    pay_frequency?: "MONTHLY" | "BIWEEKLY";
    joining_date?: string;
    probation_end_date?: string;
    probation_status?: string;
    reporting_manager_id?: string;
    salary_flat: string;
    housing_allowance?: string;
    transport_allowance?: string;
    other_benefits?: string;
    bank_name?: string;
    bank_account_no?: string;
    bank_iban?: string;
    bank_swift?: string;
    phone?: string;
    personal_email?: string;
    emergency_contact_name?: string;
    emergency_phone?: string;
    nationality?: string;
    date_of_birth?: string;
    gender?: string;
    notice_period_days?: number;
    passport_number?: string;
    passport_expiry?: string;
    visa_type?: string;
    visa_number?: string;
    visa_expiry?: string;
    work_permit_number?: string;
    employment_status?: "CANDIDATE" | "ONBOARDING" | "ACTIVE" | "TERMINATING" | "TERMINATED";
  };

  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      const payload = await apiRequest<User>("/employees", {
        method: "POST",
        body: input,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee-overview"] });
    },
  });
}

export function useUpdateEmployeeMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, patch }: { employeeId: string; patch: Record<string, unknown> }) => {
      const payload = await apiRequest<User>(`/employees/${encodeURIComponent(employeeId)}`, {
        method: "PATCH",
        body: patch,
      });
      return payload.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee-overview", variables.employeeId] });
      qc.invalidateQueries({ queryKey: ["employee-activity", variables.employeeId] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useEmployeeOverviewQuery(employeeId: string | null) {
  return useQuery({
    queryKey: ["employee-overview", employeeId],
    enabled: Boolean(getToken()) && Boolean(employeeId),
    staleTime: 180_000,
    queryFn: async () => {
      const payload = await apiRequest<EmployeeOverview>(`/employees/${encodeURIComponent(employeeId!)}/overview`);
      return payload.data;
    },
  });
}

export function useEmployeeActivityQuery(employeeId: string | null, page = 1, limit = 20, enabled = true) {
  return useQuery({
    queryKey: ["employee-activity", employeeId, page, limit],
    enabled: Boolean(getToken()) && Boolean(employeeId) && enabled,
    staleTime: 120_000,
    queryFn: async () => {
      const payload = await apiRequest<
        Array<{
          id: string;
          action: string;
          details?: string | null;
          timestamp: string;
          performer?: { id: string; full_name: string; email: string } | null;
        }>
      >(`/employees/${encodeURIComponent(employeeId!)}/activity${toQueryString({ page, limit })}`);
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useBulkEmployeeStatusMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      employee_ids: string[];
      employment_status: "CANDIDATE" | "ONBOARDING" | "ACTIVE" | "TERMINATING" | "TERMINATED";
    }) => {
      const payload = await apiRequest<{ updatedCount: number }>(`/employees/bulk/status`, {
        method: "PATCH",
        body: input,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employee-overview"] });
    },
  });
}

export function useBitrixSyncMutation() {
  return useMutation({
    mutationFn: async () => {
      const payload = await apiRequest<BitrixSyncStatus>(`/employees/sync/bitrix24`, { method: "POST" });
      return payload.data;
    },
  });
}

export function useBitrixSyncStatusQuery() {
  return useQuery({
    queryKey: ["bitrix-sync-status"],
    enabled: Boolean(getToken()),
    staleTime: 600_000,
    queryFn: async () => {
      const payload = await apiRequest<BitrixSyncStatus>(`/employees/sync/bitrix24/status`);
      return payload.data;
    },
  });
}

export function useMyLeavesQuery(pagination?: PaginationParams) {
  const { page, limit } = withPagination(pagination ?? { page: 1, limit: 100 });

  return useQuery({
    queryKey: ["my-leaves", { page, limit }],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const queryString = toQueryString({ page, limit });
      const payload = await apiRequest<LeaveRequest[]>(`/leaves/my${queryString}`);
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useLeavePreviewMutation() {
  return useMutation({
    mutationFn: async (input: {
      start_date: string;
      end_date: string;
      type: string;
      is_paid: boolean;
    }) => {
      const payload = await apiRequest<LeavePreviewResult>(`/leaves/preview`, {
        method: "POST",
        body: input,
      });
      return payload.data;
    },
  });
}

export function useLeaveRequestMutation() {
  type LeaveCreateJson = {
    start_date: string;
    end_date: string;
    type: string;
    reason?: string;
    is_paid: boolean;
    supporting_document_url?: string | null;
    supporting_file?: File | null;
  };

  return useMutation({
    mutationFn: async (input: LeaveCreateJson) => {
      if (input.supporting_file) {
        const fd = new FormData();
        fd.append("start_date", input.start_date);
        fd.append("end_date", input.end_date);
        fd.append("type", input.type);
        fd.append("is_paid", String(input.is_paid));
        if (input.reason) fd.append("reason", input.reason);
        fd.append("supporting_document", input.supporting_file);
        const payload = await apiRequest<LeaveRequest>("/leaves", {
          method: "POST",
          body: fd,
        });
        return payload.data;
      }
      const { supporting_file, ...body } = input;
      void supporting_file;
      const payload = await apiRequest<LeaveRequest>("/leaves", {
        method: "POST",
        body,
      });
      return payload.data;
    },
  });
}

export function useCancelLeaveMutation() {
  return useMutation({
    mutationFn: async (leaveId: string) => {
      const payload = await apiRequest<LeaveRequest>(`/leaves/${encodeURIComponent(leaveId)}/cancel`, {
        method: "PATCH",
        body: {},
      });
      return payload.data;
    },
  });
}

export function usePublicHolidaysQuery(year?: number) {
  return useQuery({
    queryKey: ["public-holidays", year],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const qs = year != null ? toQueryString({ year }) : "";
      const payload = await apiRequest<Array<{ id: string; date: string; name: string; country_code?: string | null }>>(
        `/leaves/public-holidays${qs}`,
      );
      return payload.data;
    },
  });
}

export function useLeaveAdminStatsQuery(year: number, month: number) {
  return useQuery({
    queryKey: ["leave-admin-stats", year, month],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<LeaveAdminStats>(
        `/leaves/admin/stats${toQueryString({ year, month })}`,
      );
      return payload.data;
    },
  });
}

export function useAdminLeaveBalancesQuery(page: number, search?: string) {
  return useQuery({
    queryKey: ["leave-admin-balances", page, search ?? ""],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<Record<string, unknown>[]>(
        `/leaves/admin/balances${toQueryString({ page, limit: 20, search })}`,
      );
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useLeaveCalendarQuery(year: number, month: number) {
  return useQuery({
    queryKey: ["leave-calendar", year, month],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<LeaveCalendarEvent[]>(
        `/leaves/admin/calendar${toQueryString({ year, month })}`,
      );
      return payload.data;
    },
  });
}

export function useLeaveSettingsQuery() {
  return useQuery({
    queryKey: ["leave-settings"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<LeaveSettingsResponse>(`/leaves/settings`);
      return payload.data;
    },
  });
}

export function useLeaveSettingsMutation() {
  return useMutation({
    mutationFn: async (body: {
      charge_excess_from_salary?: boolean;
      policies?: Array<{
        id: string;
        default_limit_days?: number | null;
        enforce_limit?: boolean;
        carry_forward_enabled?: boolean;
        carry_forward_max_days?: number | null;
      }>;
    }) => {
      const payload = await apiRequest<LeaveSettingsResponse>(`/leaves/settings`, {
        method: "PUT",
        body,
      });
      return payload.data;
    },
  });
}

export function useCreatePublicHolidayMutation() {
  return useMutation({
    mutationFn: async (body: { date: string; name: string; country_code?: string | null }) => {
      const payload = await apiRequest<{ id: string }>(`/leaves/admin/holidays`, {
        method: "POST",
        body,
      });
      return payload.data;
    },
  });
}

export function useDeletePublicHolidayMutation() {
  return useMutation({
    mutationFn: async (holidayId: string) => {
      await apiRequest(`/leaves/admin/holidays/${encodeURIComponent(holidayId)}`, {
        method: "DELETE",
      });
    },
  });
}

export function useLeaveOverridesQuery(search?: string) {
  return useQuery({
    queryKey: ["leave-overrides", search ?? ""],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const qs = search ? toQueryString({ search }) : "";
      const payload = await apiRequest<LeaveOverrideRow[]>(`/leaves/overrides${qs}`);
      return payload.data;
    },
  });
}

export function useUpsertLeaveOverrideMutation() {
  return useMutation({
    mutationFn: async (body: { user_id: string; policy_id: string; custom_limit: number }) => {
      const payload = await apiRequest<LeaveOverrideRow>(`/leaves/overrides`, {
        method: "PUT",
        body,
      });
      return payload.data;
    },
  });
}

export function useMyAssetsQuery() {
  return useQuery({
    queryKey: ["my-assets"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<Asset[]>("/users/my-assets");
      return payload.data;
    },
  });
}

export function useMyLeaveBalanceQuery() {
  return useQuery({
    queryKey: ["my-leave-balance"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<LeaveBalanceByType>("/users/my-leave-balance");
      return payload.data;
    },
  });
}

export function useMyDocumentsQuery() {
  return useQuery({
    queryKey: ["my-documents"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<DocumentItem[]>("/users/my-documents");
      return payload.data;
    },
  });
}

export function useEmployeeProfileQuery() {
  return useQuery({
    queryKey: ["employee-profile"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<User>("/employee/profile");
      return payload.data;
    },
  });
}

export function useEmployeeProfileUpdateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      full_name?: string;
      personal_email?: string;
      phone?: string;
      emergency_contact_name?: string;
      emergency_phone?: string;
      address?: string;
    }) => {
      const payload = await apiRequest<User>("/employee/profile", {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-profile"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useEmployeeAvatarUpdateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("avatar", file);

      const payload = await apiRequest<{ id: string; avatar_url: string | null; updated_at: string }>(
        "/employee/avatar",
        {
          method: "PATCH",
          body: form,
        },
      );
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-profile"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useEmployeeChangePasswordMutation() {
  return useMutation({
    mutationFn: async (body: {
      current_password: string;
      new_password: string;
      confirm_password: string;
    }) => {
      await apiRequest<null>("/auth/change-password", {
        method: "PATCH",
        body,
      });
    },
  });
}

export function useEmployeeDocumentsQuery() {
  return useQuery({
    queryKey: ["employee-documents"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<DocumentItem[]>("/employee/documents");
      return payload.data;
    },
  });
}

export function useEmployeeDocumentDownloadMutation() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const payload = await apiRequest<EmployeeDocumentDownloadPayload>(
        `/employee/documents/${encodeURIComponent(documentId)}/download`,
      );
      const url = payload.data.download_url;
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return payload.data;
    },
  });
}

function downloadBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

type PayrollRunsHistoryFilters = {
  page?: number;
  limit?: number;
  year?: number;
};

type PayrollRunsHistoryData = {
  items: PayrollRunHistoryItem[];
  meta: ApiEnvelope<PayrollRunHistoryItem[]>["meta"];
};

export function usePayrollStatsQuery(params: { month?: number; year?: number; runId?: string | null } = {}) {
  const { month, year, runId } = params;

  return useQuery<PayrollStats>({
    queryKey: ["payroll-stats", month ?? null, year ?? null, runId ?? null],
    enabled: Boolean(getToken()),
    queryFn: async (): Promise<PayrollStats> => {
      const payload = await apiRequest<PayrollStats>(
        `/payroll/stats${toQueryString({
          month,
          year,
          run_id: runId ?? undefined,
        })}`,
      );
      return payload.data;
    },
  });
}

export function usePayrollRunsHistoryQuery(filters: PayrollRunsHistoryFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  return useQuery({
    queryKey: ["payroll-runs-history", { page, limit, year: filters.year }],
    enabled: Boolean(getToken()),
    queryFn: async (): Promise<PayrollRunsHistoryData> => {
      const payload = await apiRequest<PayrollRunHistoryItem[]>(
        `/payroll/runs${toQueryString({
          page,
          limit,
          year: filters.year,
        })}`,
      );
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function usePayrollRunQuery(month: number | null, year: number | null) {
  return useQuery<PayrollRun>({
    queryKey: ["payroll-run", month, year],
    enabled: Boolean(getToken()) && month !== null && year !== null,
    queryFn: async (): Promise<PayrollRun> => {
      const payload = await apiRequest<PayrollRun>("/payroll/runs", {
        method: "POST",
        body: { month, year },
      });
      return payload.data;
    },
  });
}

export function usePayrollRunDetailQuery(runId: string | null) {
  return useQuery({
    queryKey: ["payroll-run-detail", runId],
    enabled: Boolean(getToken()) && Boolean(runId),
    queryFn: async () => {
      const payload = await apiRequest<PayrollRun>(`/payroll/runs/${encodeURIComponent(runId!)}`);
      return payload.data;
    },
  });
}

export function usePayrollAdjustmentsMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      runId,
      adjustments,
    }: {
      runId: string;
      adjustments: Array<{
        employee_id: string;
        manual_bonus?: string | number;
        manual_deduction?: string | number;
        advance_deduction?: string | number;
        notes?: string | null;
      }>;
    }) => {
      const payload = await apiRequest<PayrollRun>(`/payroll/runs/${encodeURIComponent(runId)}/adjustments`, {
        method: "POST",
        body: {
          adjustments: adjustments.map((a) => ({
            employee_id: a.employee_id,
            manual_bonus: a.manual_bonus === undefined ? undefined : String(a.manual_bonus),
            manual_deduction: a.manual_deduction === undefined ? undefined : String(a.manual_deduction),
            advance_deduction: a.advance_deduction === undefined ? undefined : String(a.advance_deduction),
            notes: a.notes,
          })),
        },
      });
      return payload.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["payroll-run-detail", variables.runId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-runs-history" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-stats" });
    },
  });
}

export function usePayrollLineUpdateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      runId,
      lineId,
      body,
    }: {
      runId: string;
      lineId: string;
      body: {
        manual_bonus?: string | number;
        manual_deduction?: string | number;
        advance_deduction?: string | number;
        notes?: string | null;
        status?: PayrollLineStatus;
      };
    }) => {
      const payload = await apiRequest<PayrollLine>(
        `/payroll/runs/${encodeURIComponent(runId)}/lines/${encodeURIComponent(lineId)}`,
        {
          method: "PATCH",
          body: {
            ...body,
            manual_bonus: body.manual_bonus === undefined ? undefined : String(body.manual_bonus),
            manual_deduction: body.manual_deduction === undefined ? undefined : String(body.manual_deduction),
            advance_deduction: body.advance_deduction === undefined ? undefined : String(body.advance_deduction),
          },
        },
      );
      return payload.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["payroll-run-detail", variables.runId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-runs-history" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-stats" });
    },
  });
}

export function usePayrollRunStatusMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ runId, status }: { runId: string; status: PayrollRunStatus }) => {
      const payload = await apiRequest<PayrollRun>(`/payroll/runs/${encodeURIComponent(runId)}/status`, {
        method: "PATCH",
        body: { status },
      });
      return payload.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["payroll-run-detail", variables.runId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-runs-history" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-stats" });
      qc.invalidateQueries({ queryKey: ["my-payroll-history"] });
      qc.invalidateQueries({ queryKey: ["my-payroll-summary"] });
    },
  });
}

export function usePayrollFinalizeMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      const payload = await apiRequest<PayrollRun>(`/payroll/runs/${encodeURIComponent(runId)}/finalize`, {
        method: "POST",
        body: {},
      });
      return payload.data;
    },
    onSuccess: (_data, runId) => {
      qc.invalidateQueries({ queryKey: ["payroll-run-detail", runId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-runs-history" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-stats" });
      qc.invalidateQueries({ queryKey: ["my-payroll-history"] });
      qc.invalidateQueries({ queryKey: ["my-payroll-summary"] });
    },
  });
}

export function usePayrollWpsExportMutation() {
  return useMutation({
    mutationFn: async (runId: string) => {
      const result = await apiRequestBlob(`/payroll/runs/${encodeURIComponent(runId)}/export/wps`);
      const filename = result.filename ?? `wps-${runId}.csv`;
      downloadBlobFile(result.blob, filename);
      return result;
    },
  });
}

export function usePayrollAdminPayslipDownloadMutation() {
  return useMutation({
    mutationFn: async ({ runId, employeeId }: { runId: string; employeeId: string }) => {
      const result = await apiRequestBlob(
        `/payroll/runs/${encodeURIComponent(runId)}/payslip/${encodeURIComponent(employeeId)}`,
      );
      const filename = result.filename ?? `payslip-${runId}-${employeeId}.pdf`;
      downloadBlobFile(result.blob, filename);
      return result;
    },
  });
}

export function useMyPayslipDownloadMutation() {
  return useMutation({
    mutationFn: async (runId: string) => {
      const result = await apiRequestBlob(`/payroll/runs/${encodeURIComponent(runId)}/payslip`);
      const filename = result.filename ?? `my-payslip-${runId}.pdf`;
      downloadBlobFile(result.blob, filename);
      return result;
    },
  });
}

export function useMyPayrollSummaryQuery() {
  return useQuery({
    queryKey: ["my-payroll-summary"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<PayrollMySummary>("/payroll/me/summary");
      return payload.data;
    },
  });
}

export function useMyPayrollHistoryQuery() {
  return useQuery({
    queryKey: ["my-payroll-history"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<PayrollRun[]>("/payroll/me");
      return payload.data;
    },
  });
}

export type ReportsHeadcountFilters = {
  month: string;
  department?: string;
  employment_type?: EmploymentType;
  status?: EmploymentStatus;
  search?: string;
  limit?: number;
  enabled?: boolean;
};

export type ReportsPayrollFilters = {
  month: string;
  department?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
};

export type ReportsLeaveFilters = {
  month: string;
  leave_type?: string;
  status?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
};

export type ReportsTurnoverFilters = {
  month: string;
  department?: string;
  reason_code?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
};

export type ReportsVisaFilters = {
  month: string;
  department?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
};

export type ReportsExportParams = {
  tab: ReportTab;
  format: ReportExportFormat;
  month: string;
  department?: string;
  employment_type?: EmploymentType;
  status?: EmploymentStatus;
  leave_type?: string;
  reason_code?: string;
  search?: string;
  limit?: number;
};

export function useReportsOverviewQuery(month: string, enabled = true) {
  return useQuery({
    queryKey: ["reports-overview", month],
    enabled: Boolean(getToken()) && enabled && Boolean(month),
    queryFn: async () => {
      const payload = await apiRequest<ReportsOverview>(`/reports/overview${toQueryString({ month })}`);
      return payload.data;
    },
  });
}

export function useReportsHeadcountQuery(filters: ReportsHeadcountFilters) {
  return useQuery({
    queryKey: ["reports-headcount", filters],
    enabled: Boolean(getToken()) && Boolean(filters.month) && (filters.enabled ?? true),
    queryFn: async () => {
      const payload = await apiRequest<ReportsHeadcount>(
        `/reports/headcount${toQueryString({
          month: filters.month,
          department: filters.department,
          employment_type: filters.employment_type,
          status: filters.status,
          search: filters.search,
          limit: filters.limit,
        })}`,
      );
      return payload.data;
    },
  });
}

export function useReportsPayrollQuery(filters: ReportsPayrollFilters) {
  return useQuery({
    queryKey: ["reports-payroll", filters],
    enabled: Boolean(getToken()) && Boolean(filters.month) && (filters.enabled ?? true),
    queryFn: async () => {
      const payload = await apiRequest<ReportsPayroll>(
        `/reports/payroll${toQueryString({
          month: filters.month,
          department: filters.department,
          search: filters.search,
          limit: filters.limit,
        })}`,
      );
      return payload.data;
    },
  });
}

export function useReportsLeaveQuery(filters: ReportsLeaveFilters) {
  return useQuery({
    queryKey: ["reports-leave", filters],
    enabled: Boolean(getToken()) && Boolean(filters.month) && (filters.enabled ?? true),
    queryFn: async () => {
      const payload = await apiRequest<ReportsLeave>(
        `/reports/leave${toQueryString({
          month: filters.month,
          leave_type: filters.leave_type,
          status: filters.status,
          search: filters.search,
          limit: filters.limit,
        })}`,
      );
      return payload.data;
    },
  });
}

export function useReportsTurnoverQuery(filters: ReportsTurnoverFilters) {
  return useQuery({
    queryKey: ["reports-turnover", filters],
    enabled: Boolean(getToken()) && Boolean(filters.month) && (filters.enabled ?? true),
    queryFn: async () => {
      const payload = await apiRequest<ReportsTurnover>(
        `/reports/turnover${toQueryString({
          month: filters.month,
          department: filters.department,
          reason_code: filters.reason_code,
          search: filters.search,
          limit: filters.limit,
        })}`,
      );
      return payload.data;
    },
  });
}

export function useReportsVisaQuery(filters: ReportsVisaFilters) {
  return useQuery({
    queryKey: ["reports-visa", filters],
    enabled: Boolean(getToken()) && Boolean(filters.month) && (filters.enabled ?? true),
    queryFn: async () => {
      const payload = await apiRequest<ReportsVisa>(
        `/reports/visa${toQueryString({
          month: filters.month,
          department: filters.department,
          search: filters.search,
          limit: filters.limit,
        })}`,
      );
      return payload.data;
    },
  });
}

export function useReportsExportMutation() {
  return useMutation({
    mutationFn: async (params: ReportsExportParams) => {
      const result = await apiRequestBlob(
        `/reports/export${toQueryString({
          tab: params.tab,
          format: params.format,
          month: params.month,
          department: params.department,
          employment_type: params.employment_type,
          status: params.status,
          leave_type: params.leave_type,
          reason_code: params.reason_code,
          search: params.search,
          limit: params.limit,
        })}`,
      );
      const ext = params.format === "pdf" ? "pdf" : "csv";
      const filename = result.filename ?? `reports-${params.tab}-${params.month}.${ext}`;
      downloadBlobFile(result.blob, filename);
      return result;
    },
  });
}

export function useAdvancesQuery(filters?: { page?: number; limit?: number; employee_id?: string; is_cleared?: boolean }) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;

  return useQuery({
    queryKey: ["advances", { page, limit, employee_id: filters?.employee_id, is_cleared: filters?.is_cleared }],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<AdvancePaymentItem[]>(
        `/advances${toQueryString({
          page,
          limit,
          employee_id: filters?.employee_id,
          is_cleared: filters?.is_cleared,
        })}`,
      );
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useCreateAdvanceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { employee_id: string; amount: string; reason?: string; monthly_deduction?: string }) => {
      const payload = await apiRequest<AdvancePaymentItem>("/advances", {
        method: "POST",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances"] });
    },
  });
}

export function useUpdateAdvanceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      advanceId,
      body,
    }: {
      advanceId: string;
      body: { amount?: string; reason?: string; is_cleared?: boolean; monthly_deduction?: string };
    }) => {
      const payload = await apiRequest<AdvancePaymentItem>(`/advances/${encodeURIComponent(advanceId)}`, {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances"] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-runs-history" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "payroll-run-detail" });
    },
  });
}

export type RecruitmentListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  position?: string;
  applied_from?: string;
  applied_to?: string;
  stage?: string;
};

type RecruitmentListData = {
  items: RecruitmentCandidate[];
  meta: ApiEnvelope<RecruitmentCandidate[]>["meta"];
};

export function useRecruitmentListQuery(filters: RecruitmentListFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 200;
  return useQuery({
    queryKey: ["recruitment-candidates", filters],
    enabled: Boolean(getToken()),
    queryFn: async (): Promise<RecruitmentListData> => {
      const payload = await apiRequest<RecruitmentCandidate[]>(
        `/recruitment${toQueryString({
          page,
          limit,
          search: filters.search,
          department: filters.department,
          position: filters.position,
          applied_from: filters.applied_from,
          applied_to: filters.applied_to,
          stage: filters.stage,
        })}`,
      );
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useRecruitmentStatsQuery() {
  return useQuery({
    queryKey: ["recruitment-stats"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<RecruitmentStats>("/recruitment/stats");
      return payload.data;
    },
  });
}

export function useRecruitmentOverviewQuery(candidateId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["recruitment-overview", candidateId],
    enabled: Boolean(getToken()) && Boolean(candidateId) && enabled,
    queryFn: async () => {
      const payload = await apiRequest<RecruitmentOverview>(
        `/recruitment/${encodeURIComponent(candidateId!)}/overview`,
      );
      return payload.data;
    },
  });
}

export type RecruitmentForwardStage = Exclude<RecruitmentStage, "REJECTED" | "ACTIVE_EMPLOYEE">;

export function usePatchRecruitmentStageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: RecruitmentForwardStage }) => {
      const payload = await apiRequest<RecruitmentCandidate>(`/recruitment/${encodeURIComponent(id)}/stage`, {
        method: "PATCH",
        body: { stage },
      });
      return payload.data;
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ predicate: (q) => q.queryKey[0] === "recruitment-candidates" });
      const snapshots = qc.getQueriesData<RecruitmentListData>({
        predicate: (q) => q.queryKey[0] === "recruitment-candidates",
      });
      qc.setQueriesData<RecruitmentListData>(
        { predicate: (q) => q.queryKey[0] === "recruitment-candidates" },
        (old) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((c) =>
              c.id === id ? { ...c, stage, stage_entered_at: new Date().toISOString() } : c,
            ),
          };
        },
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: (_data, _error, variables) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "recruitment-candidates" });
      qc.invalidateQueries({ queryKey: ["recruitment-stats"] });
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: ["recruitment-overview", variables.id] });
      }
    },
  });
}

export function useRejectRecruitmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reject_reason_code,
      reject_notes,
    }: {
      id: string;
      reject_reason_code: string;
      reject_notes?: string;
    }) => {
      const payload = await apiRequest<RecruitmentCandidate>(`/recruitment/${encodeURIComponent(id)}/reject`, {
        method: "POST",
        body: { reject_reason_code, reject_notes },
      });
      return payload.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "recruitment-candidates" });
      qc.invalidateQueries({ queryKey: ["recruitment-stats"] });
      qc.invalidateQueries({ queryKey: ["recruitment-overview", vars.id] });
    },
  });
}

export function usePromoteRecruitmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password, employee_code }: { id: string; password?: string; employee_code?: string }) => {
      const payload = await apiRequest<RecruitmentCandidate>(
        `/recruitment/${encodeURIComponent(id)}/promote-active`,
        {
          method: "POST",
          body: { password, employee_code },
        },
      );
      return payload.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "recruitment-candidates" });
      qc.invalidateQueries({ queryKey: ["recruitment-stats"] });
      qc.invalidateQueries({ queryKey: ["recruitment-overview", vars.id] });
    },
  });
}

export function useUpsertRecruitmentInterviewMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const payload = await apiRequest<unknown>(`/recruitment/${encodeURIComponent(id)}/interview`, {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recruitment-overview", vars.id] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "recruitment-candidates" });
    },
  });
}

export function useUpsertRecruitmentOfferMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const payload = await apiRequest<unknown>(`/recruitment/${encodeURIComponent(id)}/offer`, {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recruitment-overview", vars.id] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "recruitment-candidates" });
    },
  });
}

export function useUpsertRecruitmentVisaMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const payload = await apiRequest<unknown>(`/recruitment/${encodeURIComponent(id)}/visa`, {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recruitment-overview", vars.id] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "recruitment-candidates" });
    },
  });
}

export function useCreateRecruitmentStagingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: { category: string; model?: string; serial_no: string; purchase_date?: string | null; condition?: string };
    }) => {
      const payload = await apiRequest<unknown>(`/recruitment/${encodeURIComponent(id)}/staging-assets`, {
        method: "POST",
        body,
      });
      return payload.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recruitment-overview", vars.id] });
    },
  });
}

export function useDeleteRecruitmentStagingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assetId }: { id: string; assetId: string }) => {
      await apiRequest<null>(
        `/recruitment/${encodeURIComponent(id)}/staging-assets/${encodeURIComponent(assetId)}`,
        { method: "DELETE" },
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recruitment-overview", vars.id] });
    },
  });
}

export function useRecruitmentDocumentUploadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      type,
      file,
    }: {
      id: string;
      title: string;
      type: string;
      file: File;
    }) => {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("type", type);
      fd.set("document", file);
      const payload = await apiRequest<unknown>(`/recruitment/${encodeURIComponent(id)}/documents`, {
        method: "POST",
        body: fd,
      });
      return payload.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["recruitment-overview", vars.id] });
    },
  });
}

export function useRecruitmentMeQuery() {
  return useQuery({
    queryKey: ["recruitment-me"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<RecruitmentMeResponse>("/recruitment/me");
      return payload.data;
    },
  });
}

export function useRecruitmentMeDocumentUploadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, type, file }: { title: string; type: string; file: File }) => {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("type", type);
      fd.set("document", file);
      const payload = await apiRequest<unknown>("/recruitment/me/documents", {
        method: "POST",
        body: fd,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recruitment-me"] });
    },
  });
}

export function useOffboardingCasesQuery(filters?: {
  page?: number;
  limit?: number;
  status?: string;
  user_id?: string;
  tab?: "active" | "completed" | "archived";
  search?: string;
}) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;

  return useQuery({
    queryKey: ["offboarding-cases", { page, limit, ...filters }],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<OffboardingCase[]>(
        `/offboarding${toQueryString({
          page,
          limit,
          status: filters?.status,
          user_id: filters?.user_id,
          tab: filters?.tab,
          search: filters?.search,
        })}`,
      );
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useOffboardingStatsQuery() {
  return useQuery({
    queryKey: ["offboarding-stats"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<OffboardingStats>("/offboarding/stats");
      return payload.data;
    },
  });
}

export function useOffboardingCaseQuery(caseId: string | null) {
  return useQuery({
    queryKey: ["offboarding-case", caseId],
    enabled: Boolean(getToken()) && Boolean(caseId),
    queryFn: async () => {
      const payload = await apiRequest<OffboardingCase>(`/offboarding/${encodeURIComponent(caseId!)}`);
      return payload.data;
    },
  });
}

export function useCreateOffboardingCaseMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      reason_code?: string;
      reason_detail?: string;
      effective_date: string;
      documents_note?: string;
    }) => {
      const payload = await apiRequest<OffboardingCase>("/offboarding", {
        method: "POST",
        body: input,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offboarding-cases"] });
      qc.invalidateQueries({ queryKey: ["offboarding-stats"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateOffboardingCaseMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const payload = await apiRequest<OffboardingCase>(`/offboarding/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["offboarding-cases"] });
      qc.invalidateQueries({ queryKey: ["offboarding-stats"] });
      qc.invalidateQueries({ queryKey: ["offboarding-case", data.id] });
    },
  });
}

export function useUpdateOffboardingTaskMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      taskId,
      status,
    }: {
      caseId: string;
      taskId: string;
      status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "NOT_APPLICABLE";
    }) => {
      const payload = await apiRequest<OffboardingCase>(
        `/offboarding/${encodeURIComponent(caseId)}/tasks/${encodeURIComponent(taskId)}`,
        {
          method: "PATCH",
          body: { status },
        },
      );
      return payload.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["offboarding-cases"] });
      qc.invalidateQueries({ queryKey: ["offboarding-stats"] });
      qc.invalidateQueries({ queryKey: ["offboarding-case", data.id] });
      qc.invalidateQueries({ queryKey: ["offboarding-me"] });
    },
  });
}

export function useUpdateOffboardingAssetReturnMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      assetReturnId,
      status,
      notes,
    }: {
      caseId: string;
      assetReturnId: string;
      status: "PENDING" | "RETURNED" | "NOT_APPLICABLE";
      notes?: string | null;
    }) => {
      const payload = await apiRequest<OffboardingCase>(
        `/offboarding/${encodeURIComponent(caseId)}/assets/${encodeURIComponent(assetReturnId)}`,
        {
          method: "PATCH",
          body: { status, notes },
        },
      );
      return payload.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["offboarding-cases"] });
      qc.invalidateQueries({ queryKey: ["offboarding-stats"] });
      qc.invalidateQueries({ queryKey: ["offboarding-case", data.id] });
      qc.invalidateQueries({ queryKey: ["offboarding-me"] });
    },
  });
}

export function useUpdateOffboardingVisaMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, body }: { caseId: string; body: Record<string, unknown> }) => {
      const payload = await apiRequest<OffboardingCase>(`/offboarding/${encodeURIComponent(caseId)}/visa`, {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["offboarding-cases"] });
      qc.invalidateQueries({ queryKey: ["offboarding-stats"] });
      qc.invalidateQueries({ queryKey: ["offboarding-case", data.id] });
      qc.invalidateQueries({ queryKey: ["offboarding-me"] });
    },
  });
}

export function useCompleteOffboardingMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const payload = await apiRequest<OffboardingCase>(`/offboarding/${encodeURIComponent(caseId)}/complete`, {
        method: "POST",
        body: {},
      });
      return payload.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["offboarding-cases"] });
      qc.invalidateQueries({ queryKey: ["offboarding-stats"] });
      qc.invalidateQueries({ queryKey: ["offboarding-case", data.id] });
      qc.invalidateQueries({ queryKey: ["offboarding-me"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useOffboardingMeQuery() {
  return useQuery({
    queryKey: ["offboarding-me"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<OffboardingCase | null>("/offboarding/me");
      return payload.data;
    },
  });
}

export function useOffboardingMeDocumentUploadMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, type, file }: { title: string; type: string; file: File }) => {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("type", type);
      fd.set("document", file);
      const payload = await apiRequest<unknown>("/offboarding/me/documents", {
        method: "POST",
        body: fd,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offboarding-me"] });
    },
  });
}

export type FeedbackAdminFilters = {
  page?: number;
  limit?: number;
  category?: FeedbackCategory;
  status?: FeedbackStatus;
  sentiment?: FeedbackSentiment;
  date_from?: string;
  date_to?: string;
  search?: string;
  enabled?: boolean;
};

export type FeedbackAnalyticsFilters = {
  date_from?: string;
  date_to?: string;
  enabled?: boolean;
};

type FeedbackListData<T> = {
  items: T[];
  meta: ApiEnvelope<T[]>["meta"];
};

export function useSubmitFeedbackMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      category: FeedbackCategory;
      sentiment: FeedbackSentiment;
      message: string;
    }) => {
      const payload = await apiRequest<FeedbackEmployeeItem>(`/feedback`, {
        method: "POST",
        body: input,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback-mine"] });
      qc.invalidateQueries({ queryKey: ["feedback-admin"] });
      qc.invalidateQueries({ queryKey: ["feedback-analytics"] });
    },
  });
}

export function useFeedbackMineQuery(pagination: PaginationParams = { page: 1, limit: 20 }) {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;

  return useQuery({
    queryKey: ["feedback-mine", { page, limit }],
    enabled: Boolean(getToken()),
    queryFn: async (): Promise<FeedbackListData<FeedbackEmployeeItem>> => {
      const payload = await apiRequest<FeedbackEmployeeItem[]>(`/feedback/mine${toQueryString({ page, limit })}`);
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useFeedbackAdminQuery(filters: FeedbackAdminFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  return useQuery({
    queryKey: [
      "feedback-admin",
      {
        page,
        limit,
        category: filters.category,
        status: filters.status,
        sentiment: filters.sentiment,
        date_from: filters.date_from,
        date_to: filters.date_to,
        search: filters.search,
      },
    ],
    enabled: Boolean(getToken()) && (filters.enabled ?? true),
    queryFn: async (): Promise<FeedbackListData<FeedbackAdminItem>> => {
      const payload = await apiRequest<FeedbackAdminItem[]>(
        `/feedback${toQueryString({
          page,
          limit,
          category: filters.category,
          status: filters.status,
          sentiment: filters.sentiment,
          date_from: filters.date_from,
          date_to: filters.date_to,
          search: filters.search,
        })}`,
      );

      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useUpdateFeedbackMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      feedbackId,
      patch,
    }: {
      feedbackId: string;
      patch: {
        status?: FeedbackStatus;
        sentiment?: FeedbackSentiment;
        admin_notes?: string | null;
      };
    }) => {
      const payload = await apiRequest<FeedbackAdminItem>(`/feedback/${encodeURIComponent(feedbackId)}`, {
        method: "PATCH",
        body: patch,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback-admin"] });
      qc.invalidateQueries({ queryKey: ["feedback-analytics"] });
      qc.invalidateQueries({ queryKey: ["feedback-mine"] });
    },
  });
}

export function useFeedbackAnalyticsQuery(filters: FeedbackAnalyticsFilters = {}) {
  return useQuery({
    queryKey: ["feedback-analytics", { date_from: filters.date_from, date_to: filters.date_to }],
    enabled: Boolean(getToken()) && (filters.enabled ?? true),
    queryFn: async () => {
      const payload = await apiRequest<FeedbackAnalyticsPayload>(
        `/feedback/analytics${toQueryString({ date_from: filters.date_from, date_to: filters.date_to })}`,
      );
      return payload.data;
    },
  });
}

export type AdminAssetsFilters = {
  page?: number;
  limit?: number;
  status?: AssetStatus;
  employee_id?: string;
  category_id?: string;
  condition?: AssetCondition;
  search?: string;
  sort_by?: "created_at" | "assigned_at" | "name" | "status";
  sort_order?: "asc" | "desc";
};

type AssetListData = {
  items: Asset[];
  meta: ApiEnvelope<Asset[]>["meta"];
};

type AssetHistoryData = {
  items: AssetAssignment[];
  meta: ApiEnvelope<AssetAssignment[]>["meta"];
};

export function useAdminAssetsQuery(filters: AdminAssetsFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  return useQuery({
    queryKey: ["admin-assets", { page, limit, ...filters }],
    enabled: Boolean(getToken()),
    queryFn: async (): Promise<AssetListData> => {
      const payload = await apiRequest<Asset[]>(
        `/assets${toQueryString({
          page,
          limit,
          status: filters.status,
          employee_id: filters.employee_id,
          category_id: filters.category_id,
          condition: filters.condition,
          search: filters.search,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order,
        })}`,
      );
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useAssetDetailQuery(assetId: string | null) {
  return useQuery({
    queryKey: ["asset-detail", assetId],
    enabled: Boolean(getToken()) && Boolean(assetId),
    queryFn: async () => {
      const payload = await apiRequest<Asset>(`/assets/${encodeURIComponent(assetId!)}`);
      return payload.data;
    },
  });
}

export function useAssetHistoryQuery(assetId: string | null, pagination: PaginationParams = { page: 1, limit: 20 }) {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;

  return useQuery({
    queryKey: ["asset-history", assetId, { page, limit }],
    enabled: Boolean(getToken()) && Boolean(assetId),
    queryFn: async (): Promise<AssetHistoryData> => {
      const payload = await apiRequest<AssetAssignment[]>(
        `/assets/${encodeURIComponent(assetId!)}/history${toQueryString({ page, limit })}`,
      );
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useAssetMetricsQuery() {
  return useQuery({
    queryKey: ["asset-metrics"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<AssetMetrics>("/assets/metrics");
      return payload.data;
    },
  });
}

export function useAssetCategoriesQuery() {
  return useQuery({
    queryKey: ["asset-categories"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<AssetCategory[]>("/assets/categories");
      return payload.data;
    },
  });
}

export function useCreateAssetMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const payload = await apiRequest<Asset>("/assets", {
        method: "POST",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
      qc.invalidateQueries({ queryKey: ["asset-metrics"] });
    },
  });
}

export function useAssetUpdateMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, patch }: { assetId: string; patch: Record<string, unknown> }) => {
      const payload = await apiRequest<Asset>(`/assets/${encodeURIComponent(assetId)}`, {
        method: "PATCH",
        body: patch,
      });
      return payload.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
      qc.invalidateQueries({ queryKey: ["asset-detail", variables.assetId] });
      qc.invalidateQueries({ queryKey: ["asset-history", variables.assetId] });
      qc.invalidateQueries({ queryKey: ["asset-metrics"] });
      qc.invalidateQueries({ queryKey: ["my-assets"] });
    },
  });
}

export function useAssetAssignMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      body,
    }: {
      assetId: string;
      body: {
        employee_id: string;
        assigned_at?: string;
        expected_return_at?: string;
        handover_notes?: string;
      };
    }) => {
      const payload = await apiRequest<Asset>(`/assets/${encodeURIComponent(assetId)}/assign`, {
        method: "POST",
        body,
      });
      return payload.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
      qc.invalidateQueries({ queryKey: ["asset-detail", vars.assetId] });
      qc.invalidateQueries({ queryKey: ["asset-history", vars.assetId] });
      qc.invalidateQueries({ queryKey: ["asset-metrics"] });
      qc.invalidateQueries({ queryKey: ["my-assets"] });
    },
  });
}

export function useAssetReturnMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      body,
    }: {
      assetId: string;
      body: {
        returned_at?: string;
        return_notes?: string;
        condition?: AssetCondition;
        status?: AssetStatus;
      };
    }) => {
      const payload = await apiRequest<Asset>(`/assets/${encodeURIComponent(assetId)}/return`, {
        method: "POST",
        body,
      });
      return payload.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
      qc.invalidateQueries({ queryKey: ["asset-detail", vars.assetId] });
      qc.invalidateQueries({ queryKey: ["asset-history", vars.assetId] });
      qc.invalidateQueries({ queryKey: ["asset-metrics"] });
      qc.invalidateQueries({ queryKey: ["my-assets"] });
      qc.invalidateQueries({ queryKey: ["offboarding-case"] });
      qc.invalidateQueries({ queryKey: ["offboarding-cases"] });
    },
  });
}

export function useAssetLifecycleMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      body,
    }: {
      assetId: string;
      body: {
        status: AssetStatus;
        condition?: AssetCondition;
        notes?: string;
      };
    }) => {
      const payload = await apiRequest<Asset>(`/assets/${encodeURIComponent(assetId)}/lifecycle`, {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
      qc.invalidateQueries({ queryKey: ["asset-detail", vars.assetId] });
      qc.invalidateQueries({ queryKey: ["asset-history", vars.assetId] });
      qc.invalidateQueries({ queryKey: ["asset-metrics"] });
      qc.invalidateQueries({ queryKey: ["my-assets"] });
    },
  });
}

export function useCreateAssetCategoryMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: { name: string; description?: string; is_active?: boolean; sort_order?: number }) => {
      const payload = await apiRequest<AssetCategory>("/assets/categories", {
        method: "POST",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-categories"] });
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
    },
  });
}

export function useUpdateAssetCategoryMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      body,
    }: {
      categoryId: string;
      body: { name?: string; description?: string | null; is_active?: boolean; sort_order?: number };
    }) => {
      const payload = await apiRequest<AssetCategory>(`/assets/categories/${encodeURIComponent(categoryId)}`, {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset-categories"] });
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
    },
  });
}

export function useUploadAssetImageMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, file }: { assetId: string; file: File }) => {
      const fd = new FormData();
      fd.append("image", file);
      const payload = await apiRequest<Asset>(`/assets/${encodeURIComponent(assetId)}/image`, {
        method: "POST",
        body: fd,
      });
      return payload.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["asset-detail", vars.assetId] });
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
    },
  });
}

export function useUploadAssetDocumentMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      title,
      type,
      file,
    }: {
      assetId: string;
      title: string;
      type: string;
      file: File;
    }) => {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("type", type);
      fd.append("document", file);
      const payload = await apiRequest<AssetDocument>(`/assets/${encodeURIComponent(assetId)}/documents`, {
        method: "POST",
        body: fd,
      });
      return payload.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["asset-detail", vars.assetId] });
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
    },
  });
}

export function useDeleteAssetDocumentMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, documentId }: { assetId: string; documentId: string }) => {
      await apiRequest<null>(`/assets/${encodeURIComponent(assetId)}/documents/${encodeURIComponent(documentId)}`, {
        method: "DELETE",
      });
      return null;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["asset-detail", vars.assetId] });
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
    },
  });
}

export function useDeleteAssetMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      await apiRequest<null>(`/assets/${encodeURIComponent(assetId)}`, {
        method: "DELETE",
      });
      return null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-assets"] });
      qc.invalidateQueries({ queryKey: ["asset-metrics"] });
    },
  });
}

export function useAssetExportMutation() {
  return useMutation({
    mutationFn: async (params: {
      format: "csv" | "json";
      status?: AssetStatus;
      category_id?: string;
      search?: string;
    }) => {
      const result = await apiRequestBlob(
        `/assets/export${toQueryString({
          format: params.format,
          status: params.status,
          category_id: params.category_id,
          search: params.search,
        })}`,
      );
      const ext = params.format === "json" ? "json" : "csv";
      const filename = result.filename ?? `assets-export.${ext}`;
      downloadBlobFile(result.blob, filename);
      return result;
    },
  });
}

export function useAdminLeavesQuery(filters?: {
  status?: string;
  type?: string;
  user_id?: string;
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 100;

  return useQuery({
    queryKey: ["admin-leaves", filters, page, limit],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<LeaveRequest[]>(
        `/leaves${toQueryString({
          page,
          limit,
          status: filters?.status,
          type: filters?.type,
          user_id: filters?.user_id,
          month: filters?.month,
          year: filters?.year,
        })}`,
      );
      return { items: payload.data, meta: payload.meta };
    },
  });
}

export function useLeaveReviewMutation() {
  return useMutation({
    mutationFn: async ({ leaveId, status }: { leaveId: string; status: "APPROVED" | "REJECTED" }) => {
      const payload = await apiRequest<LeaveRequest>(`/leaves/${encodeURIComponent(leaveId)}/review`, {
        method: "PATCH",
        body: { status },
      });
      return payload.data;
    },
  });
}

export function useAdminDocumentsQuery() {
  return useQuery({
    queryKey: ["admin-documents", 1, 500],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<DocumentItem[]>(`/documents?page=1&limit=500`);
      return payload.data;
    },
  });
}

export type VisaListFilters = {
  page?: number;
  limit?: number;
  department?: string;
  search?: string;
  status?: VisaComputedStatus;
  lifecycle_status?: VisaLifecycleStatus;
  include_inactive?: boolean;
  enabled?: boolean;
};

export function useVisaListQuery(filters: VisaListFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;

  return useQuery({
    queryKey: [
      "visa-list",
      {
        page,
        limit,
        department: filters.department,
        search: filters.search,
        status: filters.status,
        lifecycle_status: filters.lifecycle_status,
        include_inactive: filters.include_inactive,
      },
    ],
    enabled: Boolean(getToken()) && (filters.enabled ?? true),
    queryFn: async () => {
      const payload = await apiRequest<VisaListPayload>(
        `/visa${toQueryString({
          page,
          limit,
          department: filters.department,
          search: filters.search,
          status: filters.status,
          lifecycle_status: filters.lifecycle_status,
          include_inactive: filters.include_inactive,
        })}`,
      );

      return payload.data;
    },
  });
}

export function useVisaProfileQuery(userId: string | null) {
  return useQuery({
    queryKey: ["visa-profile", userId],
    enabled: Boolean(getToken()) && Boolean(userId),
    queryFn: async () => {
      const payload = await apiRequest<VisaProfileDetailPayload>(`/visa/${encodeURIComponent(userId!)}`);
      return payload.data;
    },
  });
}

export function useVisaHistoryQuery(userId: string | null, pagination?: PaginationParams) {
  const { page, limit } = withPagination(pagination);

  return useQuery({
    queryKey: ["visa-history", userId, page, limit],
    enabled: Boolean(getToken()) && Boolean(userId),
    queryFn: async () => {
      const payload = await apiRequest<VisaHistoryItem[]>(
        `/visa/${encodeURIComponent(userId!)}/history${toQueryString({ page, limit })}`,
      );
      return {
        items: payload.data,
        meta: payload.meta,
      };
    },
  });
}

export type VisaExpiringFilters = {
  days?: number;
  include_expired?: boolean;
  department?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
};

export function useVisaExpiringQuery(filters: VisaExpiringFilters = {}) {
  return useQuery({
    queryKey: [
      "visa-expiring",
      {
        days: filters.days ?? 30,
        include_expired: filters.include_expired,
        department: filters.department,
        search: filters.search,
        limit: filters.limit,
      },
    ],
    enabled: Boolean(getToken()) && (filters.enabled ?? true),
    queryFn: async () => {
      const payload = await apiRequest<VisaExpiringPayload>(
        `/visa/expiring${toQueryString({
          days: filters.days ?? 30,
          include_expired: filters.include_expired,
          department: filters.department,
          search: filters.search,
          limit: filters.limit,
        })}`,
      );
      return payload.data;
    },
  });
}

export type VisaReminderFilters = {
  page?: number;
  limit?: number;
  status?: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  reminder_type?:
    | "EXPIRY_60_DAYS"
    | "EXPIRY_30_DAYS"
    | "EXPIRY_7_DAYS"
    | "EXPIRY_DAY"
    | "EXPIRED_1_DAY"
    | "EXPIRED_7_DAYS";
  enabled?: boolean;
};

export function useVisaRemindersQuery(filters: VisaReminderFilters = {}) {
  const { page, limit } = withPagination(filters);

  return useQuery({
    queryKey: ["visa-reminders", { page, limit, status: filters.status, reminder_type: filters.reminder_type }],
    enabled: Boolean(getToken()) && (filters.enabled ?? true),
    queryFn: async () => {
      const payload = await apiRequest<VisaReminderItem[]>(
        `/visa/reminders${toQueryString({
          page,
          limit,
          status: filters.status,
          reminder_type: filters.reminder_type,
        })}`,
      );

      return {
        items: payload.data,
        meta: payload.meta,
      };
    },
  });
}

export function useUpsertVisaProfileMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      body: {
        passport_number?: string | null;
        passport_issue_date?: string | null;
        passport_expiry?: string | null;
        passport_country?: string | null;
        visa_type?: string | null;
        visa_number?: string | null;
        visa_issue_date?: string | null;
        visa_expiry?: string | null;
        work_permit_number?: string | null;
        sponsor_name?: string | null;
        status?: VisaLifecycleStatus;
        renewal_requested_at?: string | null;
        renewal_due_date?: string | null;
        cancelled_at?: string | null;
        cancellation_reason?: string | null;
        notes?: string | null;
      };
    }) => {
      const payload = await apiRequest<VisaProfileDetailPayload>(`/visa/${encodeURIComponent(input.userId)}`, {
        method: "PATCH",
        body: input.body,
      });
      return payload.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-list" });
      qc.invalidateQueries({ queryKey: ["visa-profile", variables.userId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-history" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-expiring" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-reminders" });
    },
  });
}

export function useRenewVisaMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      body: {
        new_visa_expiry: string;
        new_visa_number?: string | null;
        new_visa_issue_date?: string | null;
        renewed_at?: string | null;
        notes?: string | null;
      };
    }) => {
      const payload = await apiRequest<VisaProfileDetailPayload>(`/visa/${encodeURIComponent(input.userId)}/renew`, {
        method: "POST",
        body: input.body,
      });
      return payload.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-list" });
      qc.invalidateQueries({ queryKey: ["visa-profile", variables.userId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-history" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-expiring" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-reminders" });
    },
  });
}

export function useCancelVisaMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      body: {
        cancelled_at?: string | null;
        cancellation_reason: string;
        notes?: string | null;
      };
    }) => {
      const payload = await apiRequest<VisaProfileDetailPayload>(`/visa/${encodeURIComponent(input.userId)}/cancel`, {
        method: "POST",
        body: input.body,
      });
      return payload.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-list" });
      qc.invalidateQueries({ queryKey: ["visa-profile", variables.userId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-history" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-expiring" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-reminders" });
    },
  });
}

export function useUploadVisaDocumentMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      file: File;
      body: {
        title: string;
        type: string;
        category?: string;
        expiry_date?: string | null;
      };
    }) => {
      const form = new FormData();
      form.append("document", input.file);
      form.append("title", input.body.title);
      form.append("type", input.body.type);
      if (input.body.category) form.append("category", input.body.category);
      if (input.body.expiry_date) form.append("expiry_date", input.body.expiry_date);

      const payload = await apiRequest<{ document: unknown; link: unknown }>(
        `/visa/${encodeURIComponent(input.userId)}/documents`,
        {
          method: "POST",
          body: form,
        },
      );
      return payload.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["visa-profile", variables.userId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-history" });
    },
  });
}

export function useRunVisaMaintenanceMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const payload = await apiRequest<{
        backfill: { scanned: number; created: number };
        scheduled: { scanned: number; scheduled: number; cancelled: number };
        processed: { scanned: number; sent: number; cancelled: number; failed: number };
      }>(`/visa/maintenance/run`, {
        method: "POST",
        body: {},
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-list" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-profile" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-history" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-expiring" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "visa-reminders" });
    },
  });
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: ["settings"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<SettingsAggregatePayload>("/settings");
      return payload.data;
    },
  });
}

export function useSettingsCompanyQuery() {
  return useQuery({
    queryKey: ["settings-company"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<SettingsCompanyInfo>("/settings/company");
      return payload.data;
    },
  });
}

export function useSettingsCompanyMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      company_name?: string | null;
      employer_id?: string | null;
      trade_license_no?: string | null;
      default_bank_agent_code?: string | null;
      wps_account_number?: string | null;
    }) => {
      const payload = await apiRequest<SettingsCompanyInfo>("/settings/company", {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-company"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useSettingsCompanyLogoMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("logo", file);

      const payload = await apiRequest<SettingsCompanyInfo>("/settings/company/logo", {
        method: "PATCH",
        body: form,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-company"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useSettingsLeaveQuery() {
  return useQuery({
    queryKey: ["settings-leave"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<LeaveSettingsResponse>("/settings/leave");
      return payload.data;
    },
  });
}

export function useSettingsLeaveMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      charge_excess_from_salary?: boolean;
      policies?: Array<{
        id: string;
        default_limit_days?: number | null;
        enforce_limit?: boolean;
        carry_forward_enabled?: boolean;
        carry_forward_max_days?: number | null;
      }>;
    }) => {
      const payload = await apiRequest<LeaveSettingsResponse>("/settings/leave", {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-leave"] });
      qc.invalidateQueries({ queryKey: ["leave-settings"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useSettingsHolidaysQuery(year?: number) {
  return useQuery({
    queryKey: ["settings-holidays", year ?? null],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const queryString = year ? toQueryString({ year }) : "";
      const payload = await apiRequest<PublicHolidayRow[]>(`/settings/holidays${queryString}`);
      return payload.data;
    },
  });
}

export function useSettingsCreateHolidayMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: { date: string; name: string; country_code?: string | null }) => {
      const payload = await apiRequest<PublicHolidayRow>("/settings/holidays", {
        method: "POST",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "settings-holidays" });
      qc.invalidateQueries({ queryKey: ["settings-leave"] });
      qc.invalidateQueries({ queryKey: ["leave-settings"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useSettingsDeleteHolidayMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (holidayId: string) => {
      await apiRequest(`/settings/holidays/${encodeURIComponent(holidayId)}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "settings-holidays" });
      qc.invalidateQueries({ queryKey: ["settings-leave"] });
      qc.invalidateQueries({ queryKey: ["leave-settings"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useSettingsBitrixQuery() {
  return useQuery({
    queryKey: ["settings-bitrix"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<SettingsBitrixConfig>("/settings/bitrix");
      return payload.data;
    },
  });
}

export function useSettingsBitrixStatusQuery() {
  return useQuery({
    queryKey: ["settings-bitrix-status"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<BitrixSyncStatus>("/settings/bitrix/status");
      return payload.data;
    },
  });
}

export function useSettingsTestBitrixMutation() {
  return useMutation({
    mutationFn: async (body: { webhook_url?: string }) => {
      const payload = await apiRequest<SettingsBitrixWebhookTestResult>("/settings/bitrix/test", {
        method: "POST",
        body,
      });
      return payload.data;
    },
  });
}

export function useSettingsTriggerBitrixSyncMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const payload = await apiRequest<BitrixSyncStatus>("/settings/bitrix/sync", {
        method: "POST",
        body: {},
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-bitrix"] });
      qc.invalidateQueries({ queryKey: ["settings-bitrix-status"] });
      qc.invalidateQueries({ queryKey: ["bitrix-sync-status"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useSettingsRolesQuery() {
  return useQuery({
    queryKey: ["settings-roles"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<SettingsRolesPayload>("/settings/roles");
      return payload.data;
    },
  });
}

export function useSettingsPromoteUserMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      body,
    }: {
      userId: string;
      body: { current_password: string; reason?: string | null };
    }) => {
      const payload = await apiRequest<SettingsRoleUser>(`/settings/roles/${encodeURIComponent(userId)}/promote`, {
        method: "POST",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-roles"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useSettingsDemoteUserMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      body,
    }: {
      userId: string;
      body: { current_password: string; reason?: string | null };
    }) => {
      const payload = await apiRequest<SettingsRoleUser>(`/settings/roles/${encodeURIComponent(userId)}/demote`, {
        method: "POST",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-roles"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useSettingsNotificationsQuery() {
  return useQuery({
    queryKey: ["settings-notifications"],
    enabled: Boolean(getToken()),
    queryFn: async () => {
      const payload = await apiRequest<SettingsNotificationDefaults>("/settings/notifications");
      return payload.data;
    },
  });
}

export function useSettingsNotificationsMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: Partial<Omit<SettingsNotificationDefaults, "updated_at">>) => {
      const payload = await apiRequest<SettingsNotificationDefaults>("/settings/notifications", {
        method: "PATCH",
        body,
      });
      return payload.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings-notifications"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
