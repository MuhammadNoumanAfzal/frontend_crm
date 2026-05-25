"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmployeeDocumentDownloadMutation, useEmployeeDocumentsQuery } from "@/lib/query/hooks";
import { DownloadIcon, FileTextIcon, SearchIcon } from "lucide-react";

type TabKey = "all" | "contract" | "visa" | "id" | "payroll" | "other";

const tabLabels: Record<TabKey, string> = {
  all: "All",
  contract: "Contract",
  visa: "Visa",
  id: "ID",
  payroll: "Payroll",
  other: "Other",
};

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function categorize(type: string): Exclude<TabKey, "all"> {
  const normalized = type.trim().toLowerCase();

  if (normalized.includes("contract") || normalized.includes("offer")) return "contract";
  if (normalized.includes("visa") || normalized.includes("permit")) return "visa";
  if (normalized.includes("passport") || normalized.includes("id") || normalized.includes("emirates")) return "id";
  if (normalized.includes("payroll") || normalized.includes("payslip") || normalized.includes("salary")) return "payroll";

  return "other";
}

export default function EmployeeDocumentsPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const documentsQuery = useEmployeeDocumentsQuery();
  const downloadMutation = useEmployeeDocumentDownloadMutation();

  const rows = useMemo(() => {
    const list = documentsQuery.data ?? [];
    const q = search.trim().toLowerCase();

    return list
      .filter((doc) => {
        const inTab = tab === "all" ? true : categorize(doc.type) === tab;
        if (!inTab) return false;

        if (!q) return true;

        return `${doc.title} ${doc.type}`.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [documentsQuery.data, search, tab]);

  if (documentsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const handleDownload = async (documentId: string) => {
    try {
      await downloadMutation.mutateAsync(documentId);
      toast.success("Secure download link generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to download document");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Documents</h1>
        <p className="text-sm text-muted-foreground">View and securely download your uploaded HR documents.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>Filter by category and search by title or document type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
            <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-lg bg-muted p-1">
              {Object.entries(tabLabels).map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="capitalize">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="document-search">Search documents</Label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="document-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title or type"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-3">
            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No documents found for this filter.
              </div>
            ) : (
              rows.map((doc) => (
                <div key={doc.id} className="flex flex-col gap-3 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="size-4 text-muted-foreground" />
                      <p className="truncate font-medium">{doc.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{doc.type}</Badge>
                      <span>Uploaded {formatDate(doc.created_at)}</span>
                      <span>Expiry {formatDate(doc.expiry_date ?? null)}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={downloadMutation.isPending}
                    onClick={() => void handleDownload(doc.id)}
                  >
                    <DownloadIcon className="mr-2 size-4" />
                    Download
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
