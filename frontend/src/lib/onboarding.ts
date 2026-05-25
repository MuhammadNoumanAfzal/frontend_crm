import type { RecruitmentStage } from "@/lib/api/types";

export const ONBOARDING_STAGE_ORDER: RecruitmentStage[] = [
  "APPLIED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_DONE",
  "OFFER_EXTENDED",
  "HIRED",
  "VISA_APPLIED",
  "VISA_ARRIVED",
  "ACTIVE_EMPLOYEE",
  "REJECTED",
];

export const FORWARD_PIPELINE_STAGES: RecruitmentStage[] = [
  "APPLIED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_DONE",
  "OFFER_EXTENDED",
  "HIRED",
  "VISA_APPLIED",
  "VISA_ARRIVED",
];

export const STAGE_LABELS: Record<RecruitmentStage, string> = {
  APPLIED: "Applied",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_DONE: "Interview Done",
  OFFER_EXTENDED: "Offer Extended",
  HIRED: "Hired",
  VISA_APPLIED: "Visa Applied",
  VISA_ARRIVED: "Visa Arrived",
  ACTIVE_EMPLOYEE: "Active Employee",
  REJECTED: "Rejected",
};

export function stageLabel(stage: RecruitmentStage): string {
  return STAGE_LABELS[stage] ?? stage;
}

export function nextForwardStage(stage: RecruitmentStage): RecruitmentStage | null {
  const index = FORWARD_PIPELINE_STAGES.indexOf(stage);
  if (index < 0) return null;
  return FORWARD_PIPELINE_STAGES[index + 1] ?? null;
}

export function canForwardTransition(from: RecruitmentStage, to: RecruitmentStage): boolean {
  return nextForwardStage(from) === to;
}

export function daysInStage(stageEnteredAt: string): number {
  const entered = new Date(stageEnteredAt);
  if (Number.isNaN(entered.getTime())) return 0;
  const diff = Date.now() - entered.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function isTerminalStage(stage: RecruitmentStage): boolean {
  return stage === "REJECTED" || stage === "ACTIVE_EMPLOYEE";
}
