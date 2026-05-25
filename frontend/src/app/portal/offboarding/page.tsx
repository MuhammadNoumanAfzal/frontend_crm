"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useOffboardingMeDocumentUploadMutation, useOffboardingMeQuery } from "@/lib/query/hooks";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

export default function PortalOffboardingPage() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("EXIT_DOCUMENT");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const offboardingMeQuery = useOffboardingMeQuery();
  const uploadDocument = useOffboardingMeDocumentUploadMutation();

  if (offboardingMeQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (!offboardingMeQuery.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Offboarding</h1>
        <Card>
          <CardHeader>
            <CardTitle>No Active Offboarding Case</CardTitle>
            <CardDescription>
              Your account does not currently have an offboarding case. If this is unexpected, contact HR.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const offboardingCase = offboardingMeQuery.data;

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error("Document title is required");
      return;
    }

    if (!type.trim()) {
      toast.error("Document type is required");
      return;
    }

    if (!file) {
      toast.error("Select a file to upload");
      return;
    }

    try {
      await uploadDocument.mutateAsync({ title: title.trim(), type: type.trim(), file });
      setTitle("");
      setType("EXIT_DOCUMENT");
      setFile(null);
      toast.success("Document uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload document");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Offboarding</h1>
        <p className="text-sm text-muted-foreground">
          Review your offboarding checklist and upload required documents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{offboardingCase.user.full_name}</span>
            <Badge>{offboardingCase.status.replace(/_/g, " ")}</Badge>
          </CardTitle>
          <CardDescription>
            Effective date: {formatDate(offboardingCase.effective_date)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Required tasks completed: {offboardingCase.progress.required_tasks_completed}/
            {offboardingCase.progress.required_tasks_total}
          </p>
          <p className="text-muted-foreground">
            Assets completed: {offboardingCase.progress.assets_completed}/{offboardingCase.progress.assets_total}
          </p>
          {offboardingCase.completion_blockers.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-amber-700 dark:text-amber-400">
              {offboardingCase.completion_blockers.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p className="text-emerald-700 dark:text-emerald-400">Your case is ready for final completion by HR.</p>
          )}
          {offboardingCase.documents_note ? (
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">HR Note</p>
              <p>{offboardingCase.documents_note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offboardingCase.offboarding_tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.code.replace(/_/g, " ")}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.status.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(task.due_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>Only document upload is available in employee offboarding mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Exit clearance form" />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={type} onChange={(event) => setType(event.target.value)} placeholder="EXIT_DOCUMENT" />
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <Input
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Notes for HR"
                disabled
              />
              <p className="text-xs text-muted-foreground">Notes field is currently informational and not submitted.</p>
            </div>

            <Button type="button" onClick={() => void handleUpload()} disabled={uploadDocument.isPending}>
              Upload
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Returns</CardTitle>
        </CardHeader>
        <CardContent>
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
                {offboardingCase.asset_returns.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.asset.name}</p>
                      <p className="text-xs text-muted-foreground">{item.asset.serial_no}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>{item.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visa Cancellation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Applicable: <span className="font-medium">{offboardingCase.visa_cancellation?.is_applicable ? "Yes" : "No"}</span>
          </p>
          <p>
            Status: <span className="font-medium">{offboardingCase.visa_cancellation?.status.replace(/_/g, " ") ?? "-"}</span>
          </p>
          <p>
            Notes: <span className="font-medium">{offboardingCase.visa_cancellation?.notes || "-"}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {offboardingCase.documents.length === 0 ? (
            <p className="rounded-lg border p-3 text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            offboardingCase.documents.map((doc) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
