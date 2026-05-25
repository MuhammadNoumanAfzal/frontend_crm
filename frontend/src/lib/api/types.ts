export type Role = "ADMIN" | "EMPLOYEE";
export type EmploymentStatus =
  | "CANDIDATE"
  | "ONBOARDING"
  | "ACTIVE"
  | "TERMINATING"
  | "TERMINATED";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT";
export type PayFrequency = "MONTHLY" | "BIWEEKLY";

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface Paginated<T> {
  data: T[];
  meta: NonNullable<ApiEnvelope<T[]>["meta"]>;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  is_active: boolean;
  employment_status?: EmploymentStatus;
  bitrix_id?: string | null;
  bitrix_last_pulled_at?: string | null;
  manual_bitrix_sync_lock?: boolean;
  created_at: string;
  employee_data?: {
    employee_code?: string | null;
    department?: string | null;
    designation?: string | null;
    employment_type?: EmploymentType;
    contract_end_date?: string | null;
    salary_flat?: string;
    currency?: string;
    pay_frequency?: PayFrequency;
    housing_allowance?: string;
    transport_allowance?: string;
    other_benefits?: string;
    joining_date?: string;
    date_of_birth?: string | null;
    gender?: string | null;
    probation_end_date?: string | null;
    notice_period_days?: number | null;
    probation_status?: string | null;
    bank_name?: string | null;
    bank_account_no?: string | null;
    bank_iban?: string | null;
    bank_swift?: string | null;
    reporting_manager_id?: string | null;
    phone?: string | null;
    personal_email?: string | null;
    emergency_contact_name?: string | null;
    emergency_phone?: string | null;
    address?: string | null;
    passport_number?: string | null;
    passport_expiry?: string | null;
    visa_type?: string | null;
    visa_number?: string | null;
    visa_expiry?: string | null;
    work_permit_number?: string | null;
  } | null;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  start_date: string;
  end_date: string;
  day_count?: number | null;
  working_day_count?: number | null;
  excess_days?: number;
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  is_paid: boolean;
  reason?: string | null;
  supporting_document_url?: string | null;
  estimated_excess_deduction_amount?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface LeaveAdminStats {
  requests_this_month: number;
  pending_approval: number;
  on_leave_today: number;
  excess_deductions_month: string;
  year: number;
  month: number;
}

export interface LeaveCalendarEvent {
  id: string;
  user_id: string;
  full_name: string;
  type: string;
  start_date: string;
  end_date: string;
}

export interface LeavePolicyRow {
  id: string;
  code: string;
  display_name: string;
  default_limit_days: number | null;
  is_paid_default: boolean;
  enforce_limit: boolean;
  carry_forward_enabled: boolean;
  carry_forward_max_days: number | null;
}

export interface PublicHolidayRow {
  id: string;
  date: string;
  name: string;
  country_code?: string | null;
}

export interface LeaveSettingsResponse {
  charge_excess_from_salary: boolean;
  policies: LeavePolicyRow[];
  holidays: PublicHolidayRow[];
}

export interface LeaveOverrideRow {
  id: string;
  user_id: string;
  policy_id: string;
  custom_limit: number | null;
  user: { id: string; full_name: string; email: string; avatar_url?: string | null };
  policy: { id: string; code: string; display_name: string; default_limit_days: number | null };
}

export interface LeavePreviewResult {
  working_days: number;
  excess_days: number;
  estimated_excess_deduction: string | null;
}

export type AssetStatus = "ALLOCATED" | "RETURNED" | "DAMAGED";
export type AssetCondition = "NEW" | "GOOD" | "FAIR" | "DAMAGED" | "BROKEN";

export interface AssetCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AssetAssignment {
  id: string;
  asset_id: string;
  employee_id: string;
  assigned_by?: string | null;
  returned_by?: string | null;
  assigned_at: string;
  expected_return_at?: string | null;
  returned_at?: string | null;
  handover_notes?: string | null;
  return_notes?: string | null;
  employee?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  returned_by_user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface AssetDocument {
  id: string;
  asset_id: string;
  title: string;
  type: string;
  secure_url: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  name: string;
  serial_no: string;
  asset_tag?: string | null;
  status: AssetStatus;
  condition?: AssetCondition;
  category_id?: string | null;
  category_free_text?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  purchase_date?: string | null;
  purchase_cost?: string | null;
  warranty_expiry?: string | null;
  notes?: string | null;
  image_url?: string | null;
  image_public_id?: string | null;
  assigned_at?: string | null;
  returned_at?: string | null;
  employee_id?: string | null;
  category?: {
    id: string;
    name: string;
    is_active?: boolean;
  } | null;
  employee?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  assignments?: AssetAssignment[];
  documents?: AssetDocument[];
  _count?: {
    assignments: number;
    documents: number;
  };
  created_at: string;
  updated_at: string;
}

export interface AssetMetrics {
  total_assets: number;
  allocated_assets: number;
  returned_assets: number;
  damaged_assets: number;
  due_returns: number;
  category_breakdown: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  condition_breakdown: Array<{
    condition: AssetCondition;
    count: number;
  }>;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: string;
  secure_url: string;
  expiry_date?: string | null;
  created_at: string;
  employee_id?: string;
  employee?: {
    id: string;
    full_name: string;
    email: string;
    bitrix_id?: string | null;
  };
}

export interface EmployeeDocumentDownloadPayload {
  document_id: string;
  download_url: string;
  expires_in_seconds: number;
}

export interface EmployeeRow {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  employment_status?: EmploymentStatus;
  avatar_url: string | null;
  bitrix_id?: string | null;
  bitrix_last_pulled_at?: string | null;
  manual_bitrix_sync_lock?: boolean;
  employee_data?: {
    employee_code?: string | null;
    department?: string | null;
    designation?: string | null;
    employment_type?: EmploymentType;
    joining_date?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    nationality?: string | null;
    personal_email?: string | null;
    emergency_contact_name?: string | null;
    emergency_phone?: string | null;
    contract_end_date?: string | null;
    probation_end_date?: string | null;
    currency?: string | null;
    pay_frequency?: PayFrequency;
    bank_name?: string | null;
    bank_account_no?: string | null;
    bank_iban?: string | null;
    passport_number?: string | null;
    passport_expiry?: string | null;
    visa_type?: string | null;
    visa_number?: string | null;
    visa_expiry?: string | null;
    work_permit_number?: string | null;
    phone?: string | null;
  } | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  details?: string | null;
  performed_by: string;
  target_user?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  ip_address?: string | null;
  timestamp: string;
  performer?: { id: string; full_name: string; email: string };
  target?: { id: string; full_name: string; email: string } | null;
}

export const FEEDBACK_CATEGORIES = [
  "Work environment",
  "Management",
  "Compensation & benefits",
  "Work-life balance",
  "Tools & technology",
  "Team & culture",
  "Onboarding experience",
  "Career growth",
  "Other",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackSentiment = "positive" | "neutral" | "negative";
export type FeedbackStatus = "unreviewed" | "reviewed" | "actioned";

export interface FeedbackEmployeeItem {
  id: string;
  category: FeedbackCategory;
  sentiment: FeedbackSentiment;
  sentiment_original: FeedbackSentiment;
  message: string;
  preview: string;
  status: FeedbackStatus;
  admin_notes?: string | null;
  sentiment_overridden_at?: string | null;
  sentiment_overridden_by?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface FeedbackAdminItem {
  id: string;
  category: FeedbackCategory;
  sentiment: FeedbackSentiment;
  sentiment_original: FeedbackSentiment;
  message: string;
  preview: string;
  status: FeedbackStatus;
  admin_notes?: string | null;
  sentiment_overridden_at?: string | null;
  sentiment_overridden_by?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  employee: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
}

export interface FeedbackAnalyticsPayload {
  volumeByMonth: Array<{
    month: string;
    count: number;
  }>;
  sentimentSplit: {
    positive: number;
    neutral: number;
    negative: number;
  };
  byCategory: Array<{
    category: FeedbackCategory;
    count: number;
  }>;
  statusBreakdown: {
    unreviewed: number;
    reviewed: number;
    actioned: number;
  };
  monthStats: {
    totalThisMonth: number;
    unreviewedThisMonth: number;
    anonymousThisMonth: number;
    sentimentPercentages: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
}

export type DashboardAlertSeverity = "critical" | "warning" | "info" | "normal";
export type DashboardPayrollStatus = PayrollRunStatus | "NO_RUN";

export interface AdminDashboardPayload {
  generated_at: string;
  kpi: {
    total_active_employees: number;
    payroll_this_month_aed: number;
    payroll_status: DashboardPayrollStatus;
    pending_leave_requests: number;
    visas_expiring_30_days: number;
  };
  charts: {
    payroll_trend: Array<{
      month: string;
      payroll: number;
    }>;
    headcount_by_department: Array<{
      department: string;
      count: number;
    }>;
  };
  recent_activity: Array<{
    id: string;
    category: string;
    performer_name: string;
    performer_initials: string;
    message: string;
    timestamp: string;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    severity: DashboardAlertSeverity;
    title: string;
    description: string;
    due_in_days: number | null;
  }>;
  meta: {
    window_days: number;
    trend_months: number;
    today: string;
  };
}

export interface EmployeeDashboardPayload {
  generated_at: string;
  kpi: {
    annual_leave_left_days: number;
    net_salary_last_month_aed: number;
    net_salary_period: string | null;
    assets_assigned: number;
    days_until_next_holiday: number | null;
  };
  charts: {
    leave_taken_trend: Array<{
      month: string;
      days_taken: number;
    }>;
    leave_balance_breakdown: Array<{
      type: string;
      remaining: number;
    }>;
  };
  recent_activity: Array<{
    id: string;
    type: string;
    status: string;
    description: string;
    timestamp: string;
  }>;
  assigned_assets: Array<{
    id: string;
    name: string;
    serial_no: string;
    asset_tag?: string | null;
    category: string | null;
    status: AssetStatus;
  }>;
  next_holiday: {
    name: string;
    date: string;
    days_until: number;
  } | null;
  meta: {
    trend_months: number;
  };
}

export interface AdvancePaymentItem {
  id: string;
  amount: string;
  remaining_balance?: string | null;
  monthly_deduction?: string | null;
  reason?: string | null;
  is_cleared: boolean;
  cleared_at?: string | null;
  employee_id: string;
  approved_by?: string | null;
  created_at: string;
  employee?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface EmployeeOverview {
  employee: User;
  leaves: LeaveRequest[];
  assets: Asset[];
  documents: DocumentItem[];
  payroll: PayrollRun[];
  advances: AdvancePaymentItem[];
  activity: AuditLogItem[];
}

export interface BitrixSyncStatus {
  processed: number;
  updated: number;
  skippedLocked: number;
  timestamp: string;
  enabled: boolean;
  configured: boolean;
}

export type PayrollRunStatus = "DRAFT" | "PROCESSED";
export type PayrollLineStatus = "DRAFT" | "APPROVED" | "PAID";

export interface PayrollLine {
  id: string;
  payroll_run_id?: string;
  employee_id: string;

  base_salary: string;
  housing_allowance: string;
  transport_allowance: string;
  other_benefits: string;

  unpaid_leave_days: number;
  unpaid_leave_deduction: string;

  paid_leave_excess_days: number;
  paid_leave_excess_deduction: string;

  advance_deduction: string;

  manual_bonus: string;
  manual_deduction: string;

  working_days_in_month?: number;
  daily_rate?: string;
  status?: PayrollLineStatus;
  deduction_warning?: boolean;
  payslip_url?: string | null;
  notes?: string | null;

  net_pay: string;

  employee?: {
    id: string;
    full_name: string;
    email: string;
    employee_data?: {
      employee_code?: string | null;
      department?: string | null;
      designation?: string | null;
      bank_iban?: string | null;
      bank_name?: string | null;
      bank_agent_code?: string | null;
      emirates_id?: string | null;
      passport_number?: string | null;
      final_payroll_pending?: boolean;
    } | null;
  };
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status?: PayrollRunStatus;
  is_locked: boolean;
  finalized_at?: string | null;
  wps_exported_at?: string | null;
  wps_file_url?: string | null;
  lines: PayrollLine[];
}

export interface PayrollRunHistoryItem {
  id: string;
  month: number;
  year: number;
  status: PayrollRunStatus;
  is_locked: boolean;
  finalized_at?: string | null;
  wps_exported_at?: string | null;
  wps_file_url?: string | null;
  employee_count: number;
  total_payroll: string;
  total_deductions: string;
}

export interface PayrollStats {
  month: number;
  year: number;
  total_payroll: string;
  employee_count: number;
  total_deductions: string;
  run_status: PayrollRunStatus | "NOT_GENERATED";
}

export interface PayrollMySummary {
  current: PayrollRun | null;
  history: PayrollRun[];
}

export type ReportTab = "headcount" | "payroll" | "leave" | "turnover" | "visa";
export type ReportExportFormat = "csv" | "pdf";

export interface ReportsOverview {
  month: string;
  label: string;
  total_employees: number;
  payroll_cost: string;
  absence_rate: number;
  turnover_rate: number;
}

export interface ReportsHeadcount {
  month: string;
  label: string;
  summary: {
    total_employees: number;
    active_employees: number;
    probation_ending_30_days: number;
    contracts_ending_30_days: number;
  };
  by_department: Array<{ department: string; count: number }>;
  by_employment_type: Array<{ employment_type: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
  rows: Array<{
    employee_id: string;
    full_name: string;
    email: string;
    department: string;
    designation: string | null;
    employment_type: string;
    employment_status: string;
    joining_date: string | null;
    probation_end_date: string | null;
    contract_end_date: string | null;
  }>;
}

export interface ReportsPayroll {
  month: string;
  label: string;
  summary: {
    run_status: "DRAFT" | "PROCESSED" | "NOT_GENERATED";
    employee_count: number;
    total_payroll: string;
    total_deductions: string;
    total_gross: string;
  };
  trend: Array<{
    month: string;
    label: string;
    total_payroll: string;
    total_deductions: string;
    employee_count: number;
  }>;
  by_department: Array<{
    department: string;
    total_payroll: string;
    employee_count: number;
  }>;
  earnings_vs_deductions: Array<{
    name: "Earnings" | "Deductions" | "Net";
    amount: string;
  }>;
  rows: Array<{
    employee_id: string;
    full_name: string;
    email: string;
    department: string;
    base_salary: string;
    allowances: string;
    deductions: string;
    net_pay: string;
    line_status: string;
  }>;
}

export interface ReportsLeave {
  month: string;
  label: string;
  summary: {
    requests_total: number;
    approved: number;
    pending: number;
    rejected: number;
    on_leave_today: number;
    absence_rate: number;
    excess_deductions: string;
  };
  by_type: Array<{
    leave_type: string;
    count: number;
  }>;
  by_status: Array<{
    status: string;
    count: number;
  }>;
  trend: Array<{
    month: string;
    label: string;
    requests: number;
    approved: number;
  }>;
  rows: Array<{
    leave_id: string;
    employee_id: string;
    full_name: string;
    email: string;
    department: string;
    leave_type: string;
    status: string;
    start_date: string;
    end_date: string;
    working_days: number;
    excess_days: number;
  }>;
}

export interface ReportsTurnover {
  month: string;
  label: string;
  summary: {
    joiners: number;
    leavers: number;
    turnover_rate: number;
    open_offboarding_cases: number;
  };
  trend: Array<{
    month: string;
    label: string;
    joiners: number;
    leavers: number;
    turnover_rate: number;
  }>;
  by_reason: Array<{
    reason_code: string;
    count: number;
  }>;
  rows: Array<{
    case_id: string;
    employee_id: string;
    full_name: string;
    email: string;
    department: string;
    effective_date: string;
    completed_at: string | null;
    status: string;
    reason_code: string;
    reason_detail: string | null;
  }>;
}

export interface ReportsVisa {
  month: string;
  label: string;
  summary: {
    total_employees: number;
    valid: number;
    expiring_30_days: number;
    expiring_60_days: number;
    expiring_90_days: number;
    expired: number;
    missing: number;
    compliance_rate: number;
  };
  by_visa_type: Array<{
    visa_type: string;
    count: number;
  }>;
  expiry_buckets: Array<{
    bucket: string;
    count: number;
  }>;
  rows: Array<{
    employee_id: string;
    full_name: string;
    email: string;
    department: string;
    employment_status: string;
    visa_type: string;
    visa_number: string | null;
    visa_expiry: string | null;
    status: string;
    days_to_expiry: number | null;
  }>;
}

export type VisaLifecycleStatus = "ACTIVE" | "RENEWAL_PENDING" | "CANCELLED";

export type VisaComputedStatus =
  | "VALID"
  | "EXPIRING_30_DAYS"
  | "EXPIRING_60_DAYS"
  | "EXPIRING_90_DAYS"
  | "EXPIRED"
  | "MISSING"
  | "RENEWAL_PENDING"
  | "CANCELLED";

export interface VisaSummary {
  total_employees: number;
  valid: number;
  expiring_30_days: number;
  expiring_60_days: number;
  expiring_90_days: number;
  expired: number;
  missing: number;
  renewal_pending: number;
  cancelled: number;
  compliance_rate: number;
}

export interface VisaListRow {
  employee_id: string;
  employee_code: string | null;
  full_name: string;
  email: string;
  department: string;
  designation: string | null;
  employment_status: EmploymentStatus;
  passport_number: string | null;
  passport_expiry: string | null;
  visa_type: string;
  visa_number: string | null;
  visa_expiry: string | null;
  work_permit_number: string | null;
  sponsor_name: string | null;
  lifecycle_status: VisaLifecycleStatus;
  status: VisaComputedStatus;
  days_to_expiry: number | null;
  renewal_due_date: string | null;
  cancelled_at: string | null;
}

export interface VisaListPayload {
  summary: VisaSummary;
  rows: VisaListRow[];
  meta?: ApiEnvelope<VisaListRow[]>["meta"];
}

export interface VisaHistoryItem {
  id: string;
  visa_profile_id: string;
  action:
    | "CREATED"
    | "UPDATED"
    | "RENEWED"
    | "CANCELLED"
    | "STATUS_CHANGED"
    | "MIGRATED"
    | "DOCUMENT_LINKED"
    | "DOCUMENT_UNLINKED";
  notes: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
  performer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface VisaReminderItem {
  id: string;
  visa_profile_id: string;
  user_id: string;
  reminder_type:
    | "EXPIRY_60_DAYS"
    | "EXPIRY_30_DAYS"
    | "EXPIRY_7_DAYS"
    | "EXPIRY_DAY"
    | "EXPIRED_1_DAY"
    | "EXPIRED_7_DAYS";
  reminder_on: string;
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  sent_at: string | null;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    employee_data?: {
      employee_code?: string | null;
      department?: string | null;
    } | null;
  };
  visa_profile: {
    id: string;
    status: VisaLifecycleStatus;
    visa_number: string | null;
    visa_expiry: string | null;
  };
}

export interface VisaProfileDetailPayload {
  employee: {
    id: string;
    employee_code: string | null;
    full_name: string;
    email: string;
    employment_status: EmploymentStatus;
    department: string;
    designation: string | null;
  };
  profile_source: "visa_profile" | "employee_data";
  profile: VisaListRow;
  documents: Array<{
    id: string;
    category: string | null;
    created_at: string;
    document: DocumentItem;
  }>;
  reminder_stats: {
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
  };
  recent_history: VisaHistoryItem[];
}

export interface VisaExpiringPayload {
  days: number;
  include_expired: boolean;
  summary: {
    total_matches: number;
    expired: number;
    expiring: number;
  };
  rows: VisaListRow[];
}

export type RecruitmentStage =
  | "APPLIED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_DONE"
  | "OFFER_EXTENDED"
  | "HIRED"
  | "VISA_APPLIED"
  | "VISA_ARRIVED"
  | "ACTIVE_EMPLOYEE"
  | "REJECTED";

export type RecruitmentListInterview = {
  scheduled_at: string | null;
  outcome: "PENDING" | "PASS" | "FAIL";
  format: "IN_PERSON" | "VIDEO" | "PHONE" | null;
} | null;

export type RecruitmentListOffer = {
  status: "SENT" | "ACCEPTED" | "DECLINED";
  start_date: string | null;
} | null;

export type RecruitmentListVisa = {
  status: "APPLIED" | "ARRIVED" | "CANCELLED";
} | null;

export interface RecruitmentCandidate {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  department: string | null;
  role_title: string | null;
  stage: RecruitmentStage;
  stage_entered_at: string;
  applied_date: string;
  referred_by: string | null;
  resume_url: string | null;
  notes: string | null;
  reject_reason_code: string | null;
  reject_notes: string | null;
  decision_at: string | null;
  created_by: string | null;
  linked_user_id: string | null;
  promoted_user_id: string | null;
  created_at: string;
  updated_at: string;
  interview?: RecruitmentListInterview;
  offer?: RecruitmentListOffer;
  visa?: RecruitmentListVisa;
}

export interface RecruitmentStats {
  in_pipeline: number;
  interviews_this_week: number;
  offers_pending: number;
  hires_this_month: number;
}

export interface RecruitmentInterviewDetail {
  id: string;
  candidate_id: string;
  interviewer_id: string | null;
  scheduled_at: string | null;
  format: "IN_PERSON" | "VIDEO" | "PHONE" | null;
  outcome: "PENDING" | "PASS" | "FAIL";
  notes: string | null;
  decision: "HIRE" | "REJECT" | null;
  decision_reason: string | null;
  interviewer?: { id: string; full_name: string; email: string } | null;
}

export interface RecruitmentOfferDetail {
  id: string;
  candidate_id: string;
  salary_offered: string;
  start_date: string | null;
  employment_type: EmploymentType;
  status: "SENT" | "ACCEPTED" | "DECLINED";
  offer_letter_url: string | null;
}

export interface RecruitmentVisaDetail {
  id: string;
  candidate_id: string;
  passport_number: string | null;
  passport_expiry: string | null;
  visa_type: string | null;
  visa_number: string | null;
  application_date: string | null;
  arrived_date: string | null;
  status: "APPLIED" | "ARRIVED" | "CANCELLED";
}

export interface RecruitmentStagingAssetRow {
  id: string;
  candidate_id: string;
  category: string;
  model: string | null;
  serial_no: string;
  purchase_date: string | null;
  condition: string | null;
}

export interface RecruitmentDocumentRow {
  id: string;
  candidate_id: string;
  title: string;
  type: string;
  secure_url: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}

export type RecruitmentOverview = RecruitmentCandidate & {
  interview: RecruitmentInterviewDetail | null;
  offer: RecruitmentOfferDetail | null;
  visa: RecruitmentVisaDetail | null;
  staging_assets: RecruitmentStagingAssetRow[];
  recruitment_documents: RecruitmentDocumentRow[];
  linked_user: { id: string; full_name: string; email: string } | null;
  promoted_user: { id: string; full_name: string; email: string } | null;
  creator: { id: string; full_name: string; email: string } | null;
};

export interface RecruitmentMeResponse {
  user: {
    employment_status: EmploymentStatus;
    email: string;
    full_name: string;
  } | null;
  candidate: (RecruitmentCandidate & {
    interview: RecruitmentInterviewDetail | null;
    offer: RecruitmentOfferDetail | null;
    visa: RecruitmentVisaDetail | null;
    staging_assets: RecruitmentStagingAssetRow[];
    recruitment_documents: RecruitmentDocumentRow[];
  }) | null;
}

export type OffboardingStatus = "INITIATED" | "ASSETS_PENDING" | "CLEARANCE_PENDING" | "COMPLETED";

export type OffboardingTaskCode =
  | "KNOWLEDGE_TRANSFER"
  | "EXIT_INTERVIEW"
  | "ASSET_RETURN"
  | "ACCOUNT_DEACTIVATION"
  | "PAYROLL_CLEARANCE"
  | "DOCUMENT_HANDOVER"
  | "VISA_CANCELLATION";

export type OffboardingTaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "NOT_APPLICABLE";

export type OffboardingAssetReturnStatus = "PENDING" | "RETURNED" | "NOT_APPLICABLE";

export type OffboardingVisaStatus = "NOT_REQUIRED" | "PENDING" | "IN_PROGRESS" | "COMPLETED";

export interface OffboardingTaskRow {
  id: string;
  offboarding_case_id: string;
  code: OffboardingTaskCode;
  title: string;
  description: string | null;
  status: OffboardingTaskStatus;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  is_required: boolean;
}

export interface OffboardingAssetReturnRow {
  id: string;
  offboarding_case_id: string;
  asset_id: string;
  status: OffboardingAssetReturnStatus;
  notes: string | null;
  returned_at: string | null;
  asset: {
    id: string;
    name: string;
    serial_no: string;
    status: Asset["status"];
    notes: string | null;
    returned_at: string | null;
  };
}

export interface OffboardingVisaCancellationRow {
  id: string;
  offboarding_case_id: string;
  is_applicable: boolean;
  status: OffboardingVisaStatus;
  requested_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface OffboardingCase {
  id: string;
  user_id: string;
  reason_code: string | null;
  reason_detail: string | null;
  effective_date: string;
  status: OffboardingStatus;
  documents_note: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: Role;
    is_active: boolean;
    employment_status: EmploymentStatus;
    employee_data?: {
      department?: string | null;
      designation?: string | null;
      visa_number?: string | null;
      visa_type?: string | null;
      visa_expiry?: string | null;
    } | null;
  };
  offboarding_tasks: OffboardingTaskRow[];
  asset_returns: OffboardingAssetReturnRow[];
  visa_cancellation: OffboardingVisaCancellationRow | null;
  documents: Array<{
    id: string;
    title: string;
    type: string;
    secure_url: string;
    uploaded_by: string | null;
    created_at: string;
  }>;
  can_complete: boolean;
  completion_blockers: string[];
  progress: {
    required_tasks_total: number;
    required_tasks_completed: number;
    assets_total: number;
    assets_completed: number;
    visa_pending: boolean;
    pending_actions: number;
  };
}

export interface OffboardingStats {
  active_cases: number;
  completed_this_month: number;
  archive_ready: number;
  pending_actions: number;
}

export interface SettingsCompanyInfo {
  company_name: string | null;
  employer_id: string | null;
  trade_license_no: string | null;
  default_bank_agent_code: string | null;
  wps_account_number: string | null;
  company_logo_url: string | null;
  updated_at: string;
}

export interface SettingsBitrixConfig {
  source: "env";
  enabled: boolean;
  webhook_url: string;
  sync_interval_ms: number;
  status: BitrixSyncStatus;
}

export interface SettingsBitrixWebhookTestResult {
  ok: boolean;
  status: number;
  message: string;
  sample_users: number;
}

export interface SettingsRoleUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  employment_status: EmploymentStatus;
  created_at: string;
}

export interface SettingsRolesPayload {
  available_roles: Role[];
  totals: {
    users: number;
    admins: number;
    employees: number;
  };
  users: SettingsRoleUser[];
}

export interface SettingsNotificationDefaults {
  email_enabled: boolean;
  sms_enabled: boolean;
  leave_request_notification: boolean;
  payroll_notification: boolean;
  visa_reminder_notification: boolean;
  advance_payment_notification: boolean;
  document_expiry_notification: boolean;
  updated_at: string;
}

export interface SettingsAggregatePayload {
  company: SettingsCompanyInfo;
  leave: LeaveSettingsResponse;
  bitrix: SettingsBitrixConfig;
  roles: SettingsRolesPayload;
  notifications: SettingsNotificationDefaults;
}
