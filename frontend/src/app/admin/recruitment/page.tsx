"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { RecruitmentCandidate, RecruitmentStage } from "@/lib/api/types";
import {
  type RecruitmentForwardStage,
  useCreateRecruitmentStagingMutation,
  useDeleteRecruitmentStagingMutation,
  usePatchRecruitmentStageMutation,
  usePromoteRecruitmentMutation,
  useRecruitmentDocumentUploadMutation,
  useRecruitmentListQuery,
  useRecruitmentOverviewQuery,
  useRecruitmentStatsQuery,
  useRejectRecruitmentMutation,
  useUpsertRecruitmentInterviewMutation,
  useUpsertRecruitmentOfferMutation,
  useUpsertRecruitmentVisaMutation,
} from "@/lib/query/hooks";
import {
  canForwardTransition,
  daysInStage,
  isTerminalStage,
  ONBOARDING_STAGE_ORDER,
  stageLabel,
  STAGE_LABELS,
} from "@/lib/onboarding";
import {
  CalendarClockIcon,
  FileTextIcon,
  GripVerticalIcon,
  IdCardLanyard,
  LandmarkIcon,
  List,
  MoreHorizontalIcon,
  ShieldCheckIcon,
  UserRoundCheckIcon,
} from "lucide-react";

const BOARD_STAGES: RecruitmentStage[] = ONBOARDING_STAGE_ORDER;

type SortKey = "full_name" | "role_title" | "department" | "stage" | "applied_date" | "days_in_stage";

function isStage(value: string): value is RecruitmentStage {
  return BOARD_STAGES.includes(value as RecruitmentStage);
}

function toDateInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toDateTimeLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

function dateStartIso(input: string) {
  if (!input) return undefined;
  return new Date(`${input}T00:00:00`).toISOString();
}

function dateEndIso(input: string) {
  if (!input) return undefined;
  return new Date(`${input}T23:59:59.999`).toISOString();
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function stageSignal(candidate: RecruitmentCandidate) {
  if (candidate.stage === "INTERVIEW_SCHEDULED") {
    if (candidate.interview?.scheduled_at) return `Interview ${formatDateTime(candidate.interview.scheduled_at)}`;
    return "Interview not scheduled";
  }
  if (candidate.stage === "INTERVIEW_DONE") {
    return `Outcome: ${candidate.interview?.outcome ?? "PENDING"}`;
  }
  if (candidate.stage === "OFFER_EXTENDED") {
    return `Offer: ${candidate.offer?.status ?? "SENT"}`;
  }
  if (candidate.stage === "VISA_APPLIED" || candidate.stage === "VISA_ARRIVED") {
    return `Visa: ${candidate.visa?.status ?? "APPLIED"}`;
  }
  return "";
}

type CandidateCardProps = {
  candidate: RecruitmentCandidate;
  isBusy: boolean;
  onOpen: (candidateId: string) => void;
  onAdvance: (candidate: RecruitmentCandidate) => void;
  onReject: (candidateId: string) => void;
};

function CandidateCard({ candidate, onOpen, onAdvance, onReject, isBusy }: CandidateCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
    data: { candidateId: candidate.id, stage: candidate.stage },
  });

  const signal = stageSignal(candidate);
  const stageDays = daysInStage(candidate.stage_entered_at);
  const ageClass =
    stageDays >= 14
      ? "text-red-700"
      : stageDays >= 7
        ? "text-amber-700"
        : "text-muted-foreground";

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-background p-3 shadow-sm transition hover:border-primary/30"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{candidate.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{candidate.role_title ?? "Unknown role"}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Drag candidate"
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onOpen(candidate.id)}>Open details</DropdownMenuItem>
              {candidate.stage !== "REJECTED" && candidate.stage !== "ACTIVE_EMPLOYEE" ? (
                <DropdownMenuItem onClick={() => onReject(candidate.id)}>Reject</DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1">
        {candidate.department ? <Badge variant="outline">{candidate.department}</Badge> : null}
        <Badge variant="secondary" className={ageClass}>
          {stageDays} day{stageDays === 1 ? "" : "s"} in stage
        </Badge>
      </div>

      {signal ? <p className="mb-3 text-xs text-muted-foreground">{signal}</p> : null}

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpen(candidate.id)}>
          View
        </Button>
        {candidate.stage !== "REJECTED" && candidate.stage !== "ACTIVE_EMPLOYEE" ? (
          <Button type="button" size="sm" onClick={() => onAdvance(candidate)} disabled={isBusy}>
            {candidate.stage === "VISA_ARRIVED" ? "Promote" : "Advance"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  candidates,
  onOpen,
  onAdvance,
  onReject,
  busyCandidateId,
}: {
  stage: RecruitmentStage;
  candidates: RecruitmentCandidate[];
  onOpen: (candidateId: string) => void;
  onAdvance: (candidate: RecruitmentCandidate) => void;
  onReject: (candidateId: string) => void;
  busyCandidateId: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage, data: { stage } });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-60 min-w-70 rounded-xl border p-3 ${stage === "REJECTED"
        ? "border-red-200 bg-red-50/40"
        : isOver
          ? "border-primary bg-primary/5"
          : "bg-card"
        }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h3>
        <Badge variant="secondary">{candidates.length}</Badge>
      </div>
      <div className="space-y-2">
        {candidates.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">Drop candidate here</p>
        ) : (
          candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onOpen={onOpen}
              onAdvance={onAdvance}
              onReject={onReject}
              isBusy={busyCandidateId === candidate.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function RecruitmentPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [showRejected, setShowRejected] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("applied_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("overview");
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectCandidateId, setRejectCandidateId] = useState<string | null>(null);
  const [rejectReasonCode, setRejectReasonCode] = useState("NOT_A_FIT");
  const [rejectNotes, setRejectNotes] = useState("");

  const [interviewForm, setInterviewForm] = useState({
    interviewer_id: "",
    scheduled_at: "",
    format: "",
    outcome: "PENDING",
    notes: "",
    decision: "",
    decision_reason: "",
  });
  const [offerForm, setOfferForm] = useState({
    salary_offered: "",
    start_date: "",
    employment_type: "FULL_TIME",
    status: "SENT",
    offer_letter_url: "",
  });
  const [visaForm, setVisaForm] = useState({
    passport_number: "",
    passport_expiry: "",
    visa_type: "",
    visa_number: "",
    application_date: "",
    arrived_date: "",
    status: "APPLIED",
  });
  const [assetForm, setAssetForm] = useState({
    category: "",
    model: "",
    serial_no: "",
    purchase_date: "",
    condition: "",
  });
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [promotePassword, setPromotePassword] = useState("");
  const [promoteCode, setPromoteCode] = useState("");

  const listQuery = useRecruitmentListQuery({
    page: 1,
    limit: 300,
    search: search || undefined,
    department: department || undefined,
    position: position || undefined,
    applied_from: dateStartIso(appliedFrom),
    applied_to: dateEndIso(appliedTo),
  });
  const statsQuery = useRecruitmentStatsQuery();

  const overviewQuery = useRecruitmentOverviewQuery(selectedCandidateId, detailOpen);

  const patchStage = usePatchRecruitmentStageMutation();
  const rejectMutation = useRejectRecruitmentMutation();
  const promoteMutation = usePromoteRecruitmentMutation();
  const upsertInterview = useUpsertRecruitmentInterviewMutation();
  const upsertOffer = useUpsertRecruitmentOfferMutation();
  const upsertVisa = useUpsertRecruitmentVisaMutation();
  const createStaging = useCreateRecruitmentStagingMutation();
  const deleteStaging = useDeleteRecruitmentStagingMutation();
  const uploadDoc = useRecruitmentDocumentUploadMutation();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const list = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const selectedCandidate = useMemo(
    () => list.find((candidate) => candidate.id === rejectCandidateId) ?? null,
    [list, rejectCandidateId],
  );

  const grouped = useMemo(() => {
    const map = new Map<RecruitmentStage, RecruitmentCandidate[]>();
    for (const stage of BOARD_STAGES) {
      map.set(stage, []);
    }
    for (const candidate of list) {
      const arr = map.get(candidate.stage);
      if (arr) {
        arr.push(candidate);
      }
    }
    return map;
  }, [list]);

  const sortedList = useMemo(() => {
    const rows = [...list];
    rows.sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      if (sortKey === "applied_date") {
        return (new Date(a.applied_date).getTime() - new Date(b.applied_date).getTime()) * direction;
      }
      if (sortKey === "days_in_stage") {
        return (daysInStage(a.stage_entered_at) - daysInStage(b.stage_entered_at)) * direction;
      }
      if (sortKey === "stage") {
        return a.stage.localeCompare(b.stage) * direction;
      }
      const av = (a[sortKey] ?? "").toString().toLowerCase();
      const bv = (b[sortKey] ?? "").toString().toLowerCase();
      return av.localeCompare(bv) * direction;
    });
    return rows;
  }, [list, sortDir, sortKey]);

  useEffect(() => {
    const overview = overviewQuery.data;
    if (!overview) return;
    setInterviewForm({
      interviewer_id: overview.interview?.interviewer_id ?? "",
      scheduled_at: toDateTimeLocalInput(overview.interview?.scheduled_at),
      format: overview.interview?.format ?? "",
      outcome: overview.interview?.outcome ?? "PENDING",
      notes: overview.interview?.notes ?? "",
      decision: overview.interview?.decision ?? "",
      decision_reason: overview.interview?.decision_reason ?? "",
    });
    setOfferForm({
      salary_offered: overview.offer?.salary_offered ?? "",
      start_date: toDateInput(overview.offer?.start_date),
      employment_type: overview.offer?.employment_type ?? "FULL_TIME",
      status: overview.offer?.status ?? "SENT",
      offer_letter_url: overview.offer?.offer_letter_url ?? "",
    });
    setVisaForm({
      passport_number: overview.visa?.passport_number ?? "",
      passport_expiry: toDateInput(overview.visa?.passport_expiry),
      visa_type: overview.visa?.visa_type ?? "",
      visa_number: overview.visa?.visa_number ?? "",
      application_date: toDateInput(overview.visa?.application_date),
      arrived_date: toDateInput(overview.visa?.arrived_date),
      status: overview.visa?.status ?? "APPLIED",
    });
  }, [overviewQuery.data]);

  if (listQuery.isLoading && !listQuery.data) {
    return <PageSkeleton />;
  }

  const openRejectDialog = (candidateId: string) => {
    setRejectCandidateId(candidateId);
    setRejectReasonCode("NOT_A_FIT");
    setRejectNotes("");
    setRejectOpen(true);
  };

  const openDetails = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setDetailTab("overview");
    setDetailOpen(true);
  };

  const patchToStage = async (candidate: RecruitmentCandidate, target: RecruitmentForwardStage) => {
    setBusyCandidateId(candidate.id);
    try {
      await patchStage.mutateAsync({ id: candidate.id, stage: target });
      toast.success(`Moved ${candidate.full_name} to ${stageLabel(target)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update stage");
    } finally {
      setBusyCandidateId(null);
    }
  };

  const runPromote = async (candidateId: string, password?: string, employeeCode?: string) => {
    setBusyCandidateId(candidateId);
    try {
      await promoteMutation.mutateAsync({
        id: candidateId,
        password: password?.trim() ? password : undefined,
        employee_code: employeeCode?.trim() ? employeeCode : undefined,
      });
      toast.success("Candidate promoted to active employee");
      setPromotePassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Promotion failed");
    } finally {
      setBusyCandidateId(null);
    }
  };

  const handleAdvance = async (candidate: RecruitmentCandidate) => {
    if (candidate.stage === "VISA_ARRIVED") {
      await runPromote(candidate.id);
      return;
    }

    const stageIdx = BOARD_STAGES.indexOf(candidate.stage);
    const next = BOARD_STAGES[stageIdx + 1];
    if (!next || next === "REJECTED" || next === "ACTIVE_EMPLOYEE") return;
    await patchToStage(candidate, next as RecruitmentForwardStage);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId || !isStage(overId)) return;

    const candidate = list.find((item) => item.id === activeId);
    if (!candidate) return;
    if (candidate.stage === overId) return;

    if (overId === "REJECTED") {
      if (isTerminalStage(candidate.stage)) {
        toast.error("Cannot reject candidate from terminal stage");
        return;
      }
      openRejectDialog(candidate.id);
      return;
    }

    if (overId === "ACTIVE_EMPLOYEE") {
      if (candidate.stage !== "VISA_ARRIVED") {
        toast.error("Only VISA_ARRIVED candidates can be promoted to active employee");
        return;
      }
      await runPromote(candidate.id);
      return;
    }

    if (!canForwardTransition(candidate.stage, overId)) {
      toast.error("Invalid transition. Only next stage is allowed.");
      return;
    }

    await patchToStage(candidate, overId as RecruitmentForwardStage);
  };

  const handleReject = async () => {
    if (!rejectCandidateId) return;
    try {
      await rejectMutation.mutateAsync({
        id: rejectCandidateId,
        reject_reason_code: rejectReasonCode,
        reject_notes: rejectNotes.trim() ? rejectNotes : undefined,
      });
      setRejectOpen(false);
      toast.success("Candidate rejected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reject candidate");
    }
  };

  const toggleSort = (key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  };

  const handleSaveInterview = async () => {
    if (!selectedCandidateId) return;
    try {
      await upsertInterview.mutateAsync({
        id: selectedCandidateId,
        body: {
          interviewer_id: interviewForm.interviewer_id || null,
          scheduled_at: interviewForm.scheduled_at ? new Date(interviewForm.scheduled_at).toISOString() : null,
          format: interviewForm.format || null,
          outcome: interviewForm.outcome,
          notes: interviewForm.notes || null,
          decision: interviewForm.decision || null,
          decision_reason: interviewForm.decision_reason || null,
        },
      });
      toast.success("Interview details saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save interview");
    }
  };

  const handleSaveOffer = async () => {
    if (!selectedCandidateId) return;
    if (!offerForm.salary_offered.trim()) {
      toast.error("Salary offered is required");
      return;
    }
    try {
      await upsertOffer.mutateAsync({
        id: selectedCandidateId,
        body: {
          salary_offered: offerForm.salary_offered,
          start_date: offerForm.start_date ? new Date(`${offerForm.start_date}T00:00:00`).toISOString() : null,
          employment_type: offerForm.employment_type,
          status: offerForm.status,
          offer_letter_url: offerForm.offer_letter_url || null,
        },
      });
      toast.success("Offer details saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save offer");
    }
  };

  const handleSaveVisa = async () => {
    if (!selectedCandidateId) return;
    try {
      await upsertVisa.mutateAsync({
        id: selectedCandidateId,
        body: {
          passport_number: visaForm.passport_number || null,
          passport_expiry: visaForm.passport_expiry ? new Date(`${visaForm.passport_expiry}T00:00:00`).toISOString() : null,
          visa_type: visaForm.visa_type || null,
          visa_number: visaForm.visa_number || null,
          application_date: visaForm.application_date ? new Date(`${visaForm.application_date}T00:00:00`).toISOString() : null,
          arrived_date: visaForm.arrived_date ? new Date(`${visaForm.arrived_date}T00:00:00`).toISOString() : null,
          status: visaForm.status,
        },
      });
      toast.success("Visa details saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save visa details");
    }
  };

  const handleAddStagingAsset = async () => {
    if (!selectedCandidateId) return;
    if (!assetForm.category.trim() || !assetForm.serial_no.trim()) {
      toast.error("Category and serial number are required");
      return;
    }
    try {
      await createStaging.mutateAsync({
        id: selectedCandidateId,
        body: {
          category: assetForm.category,
          model: assetForm.model || undefined,
          serial_no: assetForm.serial_no,
          purchase_date: assetForm.purchase_date ? new Date(`${assetForm.purchase_date}T00:00:00`).toISOString() : null,
          condition: assetForm.condition || undefined,
        },
      });
      setAssetForm({ category: "", model: "", serial_no: "", purchase_date: "", condition: "" });
      toast.success("Staging asset added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add staging asset");
    }
  };

  const handleDeleteStagingAsset = async (assetId: string) => {
    if (!selectedCandidateId) return;
    try {
      await deleteStaging.mutateAsync({ id: selectedCandidateId, assetId });
      toast.success("Staging asset deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete staging asset");
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedCandidateId) return;
    if (!docTitle.trim() || !docType.trim() || !docFile) {
      toast.error("Title, type, and file are required");
      return;
    }

    try {
      await uploadDoc.mutateAsync({
        id: selectedCandidateId,
        title: docTitle,
        type: docType,
        file: docFile,
      });
      setDocTitle("");
      setDocType("");
      setDocFile(null);
      toast.success("Document uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload document");
    }
  };

  const activeOverview = overviewQuery.data;

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Onboarding Pipeline</h1>
          <p className="text-sm text-muted-foreground">Kanban and list operations for recruitment to active employee transition.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant={view === "board" ? "default" : "outline"} onClick={() => setView("board")}>
            <IdCardLanyard  />   Board
          </Button>
          <Button type="button" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
        <List/>    List
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowRejected((x) => !x)}>
            {showRejected ? "Hide Rejected" : "Show Rejected"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="In Pipeline"
          value={statsQuery.data?.in_pipeline ?? "-"}
          icon={ShieldCheckIcon}
        />
        <StatCard
          title="Interviews This Week"
          value={statsQuery.data?.interviews_this_week ?? "-"}
          icon={CalendarClockIcon}
        />
        <StatCard
          title="Offers Pending"
          value={statsQuery.data?.offers_pending ?? "-"}
          icon={LandmarkIcon}
          tone="warning"
        />
        <StatCard
          title="Hires This Month"
          value={statsQuery.data?.hires_this_month ?? "-"}
          icon={UserRoundCheckIcon}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2 lg:col-span-2">
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email, or position"
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Engineering" />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Frontend Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Applied From</Label>
              <DateRangePicker
                value={{ from: appliedFrom, to: appliedTo }}
                onChange={(range) => {
                  setAppliedFrom(range.from ?? "");
                  setAppliedTo(range.to ?? "");
                }}
                numberOfMonths={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {view === "board" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kanban Board</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <div className="flex min-w-max gap-3 pb-2">
                  {BOARD_STAGES.filter((stage) => (showRejected ? true : stage !== "REJECTED")).map((stage) => (
                    <StageColumn
                      key={stage}
                      stage={stage}
                      candidates={grouped.get(stage) ?? []}
                      onOpen={openDetails}
                      onAdvance={handleAdvance}
                      onReject={openRejectDialog}
                      busyCandidateId={busyCandidateId}
                    />
                  ))}
                </div>
              </DndContext>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidates List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" onClick={() => toggleSort("full_name")} className="hover:underline">
                      Candidate
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleSort("role_title")} className="hover:underline">
                      Position
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleSort("department")} className="hover:underline">
                      Department
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleSort("stage")} className="hover:underline">
                      Stage
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleSort("days_in_stage")} className="hover:underline">
                      Days In Stage
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleSort("applied_date")} className="hover:underline">
                      Applied
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">
                      No candidates match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedList.map((candidate) => {
                    const stageDays = daysInStage(candidate.stage_entered_at);
                    return (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{candidate.full_name}</p>
                            <p className="text-xs text-muted-foreground">{candidate.email ?? "No email"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{candidate.role_title ?? "-"}</TableCell>
                        <TableCell>{candidate.department ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={candidate.stage === "REJECTED" ? "destructive" : "secondary"}>
                            {stageLabel(candidate.stage)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              stageDays >= 14
                                ? "text-red-700"
                                : stageDays >= 7
                                  ? "text-amber-700"
                                  : "text-muted-foreground"
                            }
                          >
                            {stageDays}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(candidate.applied_date)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => openDetails(candidate.id)}>
                              Detail
                            </Button>
                            {candidate.stage !== "REJECTED" && candidate.stage !== "ACTIVE_EMPLOYEE" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleAdvance(candidate)}
                                disabled={busyCandidateId === candidate.id}
                              >
                                {candidate.stage === "VISA_ARRIVED" ? "Promote" : "Advance"}
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
          </CardContent>
        </Card>
      )}

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="sm:min-w-xl overflow-y-auto sm:max-w-5xl">
          <SheetHeader>
            <SheetTitle>
              {activeOverview?.full_name ?? "Candidate Overview"}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              {activeOverview?.role_title ?? "-"} {activeOverview?.department ? `| ${activeOverview.department}` : ""}
            </p>
          </SheetHeader>

          {overviewQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading candidate details...</div>
          ) : !activeOverview ? (
            <div className="p-4 text-sm text-muted-foreground">Select a candidate to load details.</div>
          ) : (
            <div className="p-4">
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList className="mb-3" variant="line">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="interview">Interview</TabsTrigger>
                  <TabsTrigger value="offer">Offer and Hire</TabsTrigger>
                  <TabsTrigger value="visa">Visa</TabsTrigger>
                  <TabsTrigger value="assets">Assets</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Current Stage</p>
                      <p className="font-medium">{stageLabel(activeOverview.stage)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Days In Stage</p>
                      <p className="font-medium">{daysInStage(activeOverview.stage_entered_at)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Applied Date</p>
                      <p className="font-medium">{formatDate(activeOverview.applied_date)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Linked User</p>
                      <p className="font-medium">{activeOverview.linked_user?.email ?? "Not linked"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <p className="rounded-lg border p-3 text-sm">{activeOverview.notes ?? "No notes"}</p>
                  </div>
                  {activeOverview.stage !== "REJECTED" ? (
                    <div className="flex gap-2">
                      <Button type="button" variant="destructive" onClick={() => openRejectDialog(activeOverview.id)}>
                        Reject Candidate
                      </Button>
                      {activeOverview.stage !== "ACTIVE_EMPLOYEE" ? (
                        <Button
                          type="button"
                          onClick={() => void handleAdvance(activeOverview)}
                          disabled={busyCandidateId === activeOverview.id}
                        >
                          {activeOverview.stage === "VISA_ARRIVED" ? "Promote to Active" : "Advance Stage"}
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      Rejected: {activeOverview.reject_reason_code ?? "N/A"}
                      {activeOverview.reject_notes ? ` - ${activeOverview.reject_notes}` : ""}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="interview" className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Scheduled At</Label>
                      <Input
                        type="datetime-local"
                        value={interviewForm.scheduled_at}
                        onChange={(event) =>
                          setInterviewForm((prev) => ({ ...prev, scheduled_at: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select
                        value={interviewForm.format || "none"}
                        onValueChange={(value) =>
                          setInterviewForm((prev) => ({
                            ...prev,
                            format: value == null || value === "none" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          <SelectItem value="VIDEO">Video</SelectItem>
                          <SelectItem value="IN_PERSON">In Person</SelectItem>
                          <SelectItem value="PHONE">Phone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Outcome</Label>
                      <Select
                        value={interviewForm.outcome}
                        onValueChange={(value) =>
                          setInterviewForm((prev) => ({ ...prev, outcome: value ?? "PENDING" }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="PASS">Pass</SelectItem>
                          <SelectItem value="FAIL">Fail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Decision</Label>
                      <Select
                        value={interviewForm.decision || "none"}
                        onValueChange={(value) =>
                          setInterviewForm((prev) => ({
                            ...prev,
                            decision: value == null || value === "none" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Decision" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          <SelectItem value="HIRE">Hire</SelectItem>
                          <SelectItem value="REJECT">Reject</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Decision Reason</Label>
                    <Input
                      value={interviewForm.decision_reason}
                      onChange={(event) =>
                        setInterviewForm((prev) => ({ ...prev, decision_reason: event.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={interviewForm.notes}
                      onChange={(event) => setInterviewForm((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Interview notes"
                    />
                  </div>
                  <Button type="button" onClick={() => void handleSaveInterview()} disabled={upsertInterview.isPending}>
                    Save Interview
                  </Button>
                </TabsContent>

                <TabsContent value="offer" className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Salary Offered</Label>
                      <Input
                        value={offerForm.salary_offered}
                        onChange={(event) => setOfferForm((prev) => ({ ...prev, salary_offered: event.target.value }))}
                        placeholder="9000.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <DatePicker
                        value={offerForm.start_date}
                        onChange={(value) => setOfferForm((prev) => ({ ...prev, start_date: value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employment Type</Label>
                      <Select
                        value={offerForm.employment_type}
                        onValueChange={(value) =>
                          setOfferForm((prev) => ({ ...prev, employment_type: value ?? "FULL_TIME" }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL_TIME">Full Time</SelectItem>
                          <SelectItem value="PART_TIME">Part Time</SelectItem>
                          <SelectItem value="CONTRACT">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={offerForm.status}
                        onValueChange={(value) =>
                          setOfferForm((prev) => ({ ...prev, status: value ?? "SENT" }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SENT">Sent</SelectItem>
                          <SelectItem value="ACCEPTED">Accepted</SelectItem>
                          <SelectItem value="DECLINED">Declined</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Offer Letter URL</Label>
                    <Input
                      value={offerForm.offer_letter_url}
                      onChange={(event) =>
                        setOfferForm((prev) => ({ ...prev, offer_letter_url: event.target.value }))
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <Button type="button" onClick={() => void handleSaveOffer()} disabled={upsertOffer.isPending}>
                    Save Offer
                  </Button>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium">Promote To Active Employee</h4>
                    <p className="text-xs text-muted-foreground">
                      Promotion works from VISA_ARRIVED stage. Password is required only when creating a new user.
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Temporary Password (optional)</Label>
                        <Input
                          type="password"
                          value={promotePassword}
                          onChange={(event) => setPromotePassword(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Employee Code (optional)</Label>
                        <Input value={promoteCode} onChange={(event) => setPromoteCode(event.target.value)} />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => void runPromote(activeOverview.id, promotePassword, promoteCode)}
                      disabled={promoteMutation.isPending || activeOverview.stage !== "VISA_ARRIVED"}
                    >
                      Promote Candidate
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="visa" className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Passport Number</Label>
                      <Input
                        value={visaForm.passport_number}
                        onChange={(event) => setVisaForm((prev) => ({ ...prev, passport_number: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Passport Expiry</Label>
                      <DatePicker
                        value={visaForm.passport_expiry}
                        onChange={(value) => setVisaForm((prev) => ({ ...prev, passport_expiry: value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Visa Type</Label>
                      <Input
                        value={visaForm.visa_type}
                        onChange={(event) => setVisaForm((prev) => ({ ...prev, visa_type: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Visa Number</Label>
                      <Input
                        value={visaForm.visa_number}
                        onChange={(event) => setVisaForm((prev) => ({ ...prev, visa_number: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Application Date</Label>
                      <DatePicker
                        value={visaForm.application_date}
                        onChange={(value) =>
                          setVisaForm((prev) => ({ ...prev, application_date: value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Arrival Date</Label>
                      <DatePicker
                        value={visaForm.arrived_date}
                        onChange={(value) => setVisaForm((prev) => ({ ...prev, arrived_date: value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Status</Label>
                      <Select
                        value={visaForm.status}
                        onValueChange={(value) =>
                          setVisaForm((prev) => ({ ...prev, status: value ?? "APPLIED" }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APPLIED">Applied</SelectItem>
                          <SelectItem value="ARRIVED">Arrived</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="button" onClick={() => void handleSaveVisa()} disabled={upsertVisa.isPending}>
                    Save Visa
                  </Button>
                </TabsContent>

                <TabsContent value="assets" className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={assetForm.category}
                        onChange={(event) => setAssetForm((prev) => ({ ...prev, category: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input
                        value={assetForm.model}
                        onChange={(event) => setAssetForm((prev) => ({ ...prev, model: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Serial No</Label>
                      <Input
                        value={assetForm.serial_no}
                        onChange={(event) => setAssetForm((prev) => ({ ...prev, serial_no: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <DatePicker
                        value={assetForm.purchase_date}
                        onChange={(value) => setAssetForm((prev) => ({ ...prev, purchase_date: value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Condition</Label>
                      <Input
                        value={assetForm.condition}
                        onChange={(event) => setAssetForm((prev) => ({ ...prev, condition: event.target.value }))}
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={() => void handleAddStagingAsset()} disabled={createStaging.isPending}>
                    Add Staging Asset
                  </Button>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Serial</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeOverview.staging_assets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No staging assets yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeOverview.staging_assets.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell>{asset.category}</TableCell>
                            <TableCell>{asset.model ?? "-"}</TableCell>
                            <TableCell>{asset.serial_no}</TableCell>
                            <TableCell>{asset.condition ?? "-"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => void handleDeleteStagingAsset(asset.id)}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="documents" className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={docTitle} onChange={(event) => setDocTitle(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input value={docType} onChange={(event) => setDocType(event.target.value)} placeholder="passport" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>File</Label>
                      <Input
                        type="file"
                        onChange={(event) => setDocFile(event.target.files?.[0] ?? null)}
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={() => void handleUploadDocument()} disabled={uploadDoc.isPending}>
                    Upload Document
                  </Button>

                  <div className="space-y-2">
                    {activeOverview.recruitment_documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                    ) : (
                      activeOverview.recruitment_documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.secure_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40"
                        >
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.type} | {formatDate(doc.created_at)}
                            </p>
                          </div>
                          <FileTextIcon className="size-4 text-muted-foreground" />
                        </a>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Candidate</DialogTitle>
            <DialogDescription>
              {selectedCandidate ? `Reject ${selectedCandidate.full_name}` : "Reject selected candidate"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={rejectReasonCode} onValueChange={(value) => setRejectReasonCode(value ?? "NOT_A_FIT")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_A_FIT">Not a fit</SelectItem>
                  <SelectItem value="SKILL_GAP">Skill gap</SelectItem>
                  <SelectItem value="SALARY_EXPECTATION">Salary expectation mismatch</SelectItem>
                  <SelectItem value="WITHDRAWN">Candidate withdrawn</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={rejectNotes}
                onChange={(event) => setRejectNotes(event.target.value)}
                placeholder="Optional context"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleReject()} disabled={rejectMutation.isPending}>
              Reject Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
