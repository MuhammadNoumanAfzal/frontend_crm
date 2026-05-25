"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useRecruitmentMeDocumentUploadMutation, useRecruitmentMeQuery } from "@/lib/query/hooks";
import { ONBOARDING_STAGE_ORDER, stageLabel, daysInStage } from "@/lib/onboarding";
import { CheckCircle2Icon, Clock3Icon, FileTextIcon } from "lucide-react";

const EMPLOYEE_PIPELINE = ONBOARDING_STAGE_ORDER.filter((stage) => stage !== "REJECTED");

const genericChecklist = [
  "Sign and submit onboarding documents",
  "Complete profile and emergency details",
  "Collect company assets",
  "Review HR policies",
  "Join induction meeting",
] as const;

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

export default function PortalOnboardingPage() {
  const meQuery = useRecruitmentMeQuery();
  const uploadMutation = useRecruitmentMeDocumentUploadMutation();

  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");

  const payload = meQuery.data;
  const candidate = payload?.candidate;
  const user = payload?.user;

  const currentIndex = useMemo(() => {
    if (!candidate) return -1;
    if (candidate.stage === "REJECTED") return -1;
    return EMPLOYEE_PIPELINE.indexOf(candidate.stage);
  }, [candidate]);

  if (meQuery.isLoading) return <PageSkeleton />;

  const handleUpload = async () => {
    if (!title.trim() || !type.trim() || !file) {
      toast.error("Title, type, and file are required");
      return;
    }
    try {
      await uploadMutation.mutateAsync({ title, type, file });
      toast.success("Document uploaded successfully");
      setTitle("");
      setType("");
      setFile(null);
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload document");
    }
  };

  if (candidate && candidate.stage !== "REJECTED") {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Onboarding Progress</h1>
          <p className="text-sm text-muted-foreground">
            Follow your recruitment and onboarding progress in read-only mode.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Stage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge>{stageLabel(candidate.stage)}</Badge>
            <span className="text-sm text-muted-foreground">
              {daysInStage(candidate.stage_entered_at)} day(s) in current stage
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {EMPLOYEE_PIPELINE.map((stage, index) => {
              const done = currentIndex > -1 && index < currentIndex;
              const current = index === currentIndex;
              return (
                <div
                  key={stage}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    current ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2Icon className="size-4 text-emerald-600" />
                    ) : (
                      <Clock3Icon className="size-4 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium">{stageLabel(stage)}</p>
                  </div>
                  <Badge variant={current ? "default" : done ? "secondary" : "outline"}>
                    {current ? "Current" : done ? "Done" : "Pending"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Dates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Applied</p>
              <p className="font-medium">{formatDate(candidate.applied_date)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Interview</p>
              <p className="font-medium">{formatDateTime(candidate.interview?.scheduled_at)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Offer Start Date</p>
              <p className="font-medium">{formatDate(candidate.offer?.start_date)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Visa Arrival</p>
              <p className="font-medium">{formatDate(candidate.visa?.arrived_date)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Passport copy" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={type} onChange={(event) => setType(event.target.value)} placeholder="passport" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>File</Label>
                <Input
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes (optional)</Label>
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Context for HR" />
              </div>
            </div>
            <Button type="button" onClick={() => void handleUpload()} disabled={uploadMutation.isPending}>
              Upload
            </Button>
            <Separator />
            <div className="space-y-2">
              {candidate.recruitment_documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No uploaded documents yet.</p>
              ) : (
                candidate.recruitment_documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.secure_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.type}</p>
                    </div>
                    <FileTextIcon className="size-4 text-muted-foreground" />
                  </a>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!candidate && user?.employment_status === "ONBOARDING") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Onboarding Checklist</h1>
          <p className="text-sm text-muted-foreground">You are in onboarding. Complete these tasks to get started.</p>
        </div>
        <Card>
          <CardContent className="grid gap-2 p-4 md:grid-cols-2">
            {genericChecklist.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                <CheckCircle2Icon className="size-4 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>No Application On File</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          We could not find a recruitment pipeline linked to your account.
        </p>
      </CardContent>
    </Card>
  );
}
