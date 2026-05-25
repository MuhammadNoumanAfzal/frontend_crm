"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  FEEDBACK_CATEGORIES,
  type FeedbackAdminItem,
  type FeedbackCategory,
  type FeedbackSentiment,
  type FeedbackStatus,
} from "@/lib/api/types";
import {
  useFeedbackAdminQuery,
  useFeedbackAnalyticsQuery,
  useFeedbackMineQuery,
  useSubmitFeedbackMutation,
  useUpdateFeedbackMutation,
  useEmployeesQuery,
} from "@/lib/query/hooks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, chartPalette, chartTooltipCursor, type ChartConfig } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { CalendarClockIcon, ChevronsUpDownIcon, MessageSquareIcon, ShieldAlertIcon } from "lucide-react";

const FEEDBACK_SENTIMENTS: FeedbackSentiment[] = ["positive", "neutral", "negative"];
const FEEDBACK_STATUSES: FeedbackStatus[] = ["unreviewed", "reviewed", "actioned"];

const SENTIMENT_LABELS: Record<FeedbackSentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  unreviewed: "Unreviewed",
  reviewed: "Reviewed",
  actioned: "Actioned",
};

const STATUS_LABELS_EMPLOYEE: Record<FeedbackStatus, string> = {
  unreviewed: "Submitted",
  reviewed: "Reviewed",
  actioned: "Actioned",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString(undefined, { month: "short" });
}

function statusVariant(status: FeedbackStatus): "default" | "secondary" | "outline" {
  if (status === "actioned") return "default";
  if (status === "reviewed") return "secondary";
  return "outline";
}

function sentimentVariant(sentiment: FeedbackSentiment): "default" | "secondary" | "destructive" {
  if (sentiment === "positive") return "default";
  if (sentiment === "neutral") return "secondary";
  return "destructive";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

type FeedbackWorkspaceMode = "admin" | "employee";

export function FeedbackWorkspace({ mode }: { mode: FeedbackWorkspaceMode }) {
  if (mode === "admin") {
    return <AdminFeedbackWorkspace />;
  }
  return <EmployeeFeedbackWorkspace />;
}

function EmployeeFeedbackWorkspace() {
  const [page, setPage] = useState(1);

  const mineQuery = useFeedbackMineQuery({ page, limit: 8 });

  const rows = mineQuery.data?.items ?? [];
  const meta = mineQuery.data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Feedback shared with you by HR or admin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feedback Received</CardTitle>
          <CardDescription>Read-only history of feedback shared with you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No feedback received yet.
            </div>
          ) : (
            rows.map((item) => (
              <div key={item.id} className="space-y-2 rounded-xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge variant={sentimentVariant(item.sentiment)}>{SENTIMENT_LABELS[item.sentiment]}</Badge>
                  <Badge variant={statusVariant(item.status)}>{STATUS_LABELS_EMPLOYEE[item.status]}</Badge>
                </div>
                <p className="text-sm leading-relaxed">{item.message}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{formatDateTime(item.created_at)}</span>
                  <span>From admin / HR</span>
                  <span>{item.reviewed_at ? `Reviewed ${formatDate(item.reviewed_at)}` : "Awaiting review"}</span>
                </div>
              </div>
            ))
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Page {meta?.page ?? page} of {meta?.totalPages ?? 1}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={(meta?.page ?? page) <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!meta?.hasNext}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminFeedbackWorkspace() {
  const [employeeId, setEmployeeId] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>(FEEDBACK_CATEGORIES[0]);
  const [sentiment, setSentiment] = useState<FeedbackSentiment>("neutral");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sentimentFilter, setSentimentFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<FeedbackAdminItem | null>(null);
  const [draftStatus, setDraftStatus] = useState<FeedbackStatus>("unreviewed");
  const [draftSentiment, setDraftSentiment] = useState<FeedbackSentiment>("neutral");
  const [draftNotes, setDraftNotes] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const submitFeedback = useSubmitFeedbackMutation();
  const employeesQuery = useEmployeesQuery({ page: 1, limit: 200 });
  const adminQuery = useFeedbackAdminQuery({
    page,
    limit: 15,
    category: categoryFilter === "ALL" ? undefined : (categoryFilter as FeedbackCategory),
    status: statusFilter === "ALL" ? undefined : (statusFilter as FeedbackStatus),
    sentiment: sentimentFilter === "ALL" ? undefined : (sentimentFilter as FeedbackSentiment),
    date_from: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
    date_to: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
    search: search.trim() || undefined,
  });

  const byCategoryQuery = useFeedbackAdminQuery({
    page: 1,
    limit: 200,
    category: categoryFilter === "ALL" ? undefined : (categoryFilter as FeedbackCategory),
    status: statusFilter === "ALL" ? undefined : (statusFilter as FeedbackStatus),
    sentiment: sentimentFilter === "ALL" ? undefined : (sentimentFilter as FeedbackSentiment),
    date_from: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
    date_to: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
    search: search.trim() || undefined,
    enabled: tab === "by-category",
  });

  const analyticsQuery = useFeedbackAnalyticsQuery();
  const updateFeedback = useUpdateFeedbackMutation();

  const rows = adminQuery.data?.items ?? [];
  const meta = adminQuery.data?.meta;
  const analytics = analyticsQuery.data;
  const employeeOptions = employeesQuery.data?.data ?? [];

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, FeedbackAdminItem[]>();
    for (const item of byCategoryQuery.data?.items ?? []) {
      const key = item.category;
      const arr = groups.get(key) ?? [];
      arr.push(item);
      groups.set(key, arr);
    }

    return Array.from(groups.entries())
      .map(([category, items]) => ({
        category,
        count: items.length,
        lastSubmission: items
          .map((item) => new Date(item.created_at))
          .sort((a, b) => b.getTime() - a.getTime())[0]
          ?.toISOString(),
        items: items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [byCategoryQuery.data?.items]);

  const sentimentTotal =
    (analytics?.sentimentSplit.positive ?? 0) +
    (analytics?.sentimentSplit.neutral ?? 0) +
    (analytics?.sentimentSplit.negative ?? 0);

  const sentimentPercentages = {
    positive: sentimentTotal ? Math.round(((analytics?.sentimentSplit.positive ?? 0) / sentimentTotal) * 100) : 0,
    neutral: sentimentTotal ? Math.round(((analytics?.sentimentSplit.neutral ?? 0) / sentimentTotal) * 100) : 0,
    negative: sentimentTotal ? Math.round(((analytics?.sentimentSplit.negative ?? 0) / sentimentTotal) * 100) : 0,
  };

  const volumeConfig = {
    count: { label: "Submissions", color: chartPalette[0] },
  } satisfies ChartConfig;

  const categoryConfig = {
    value: { label: "Category", color: chartPalette[0] },
  } satisfies ChartConfig;

  const openSheet = (item: FeedbackAdminItem) => {
    setSelected(item);
    setDraftStatus(item.status);
    setDraftSentiment(item.sentiment);
    setDraftNotes(item.admin_notes ?? "");
    setSheetOpen(true);
  };

  const saveSheet = async () => {
    if (!selected) return;

    const patch: {
      status?: FeedbackStatus;
      sentiment?: FeedbackSentiment;
      admin_notes?: string | null;
    } = {};

    if (draftStatus !== selected.status) {
      patch.status = draftStatus;
    }
    if (draftSentiment !== selected.sentiment) {
      patch.sentiment = draftSentiment;
    }

    const nextNotes = sanitizeText(draftNotes).trim();
    const currentNotes = (selected.admin_notes ?? "").trim();
    if (nextNotes !== currentNotes) {
      patch.admin_notes = nextNotes || null;
    }

    if (Object.keys(patch).length === 0) {
      toast.error("No changes to save.");
      return;
    }

    try {
      await updateFeedback.mutateAsync({ feedbackId: selected.id, patch });
      toast.success("Feedback updated.");
      setSheetOpen(false);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update feedback");
    }
  };

  const quickStatusUpdate = async (item: FeedbackAdminItem, nextStatus: FeedbackStatus) => {
    if (item.status === nextStatus) return;

    try {
      await updateFeedback.mutateAsync({
        feedbackId: item.id,
        patch: { status: nextStatus },
      });
      toast.success(`Marked as ${STATUS_LABELS[nextStatus].toLowerCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update status");
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanedMessage = sanitizeText(message).trim();

    if (!employeeId) {
      toast.error("Select an employee.");
      return;
    }
    if (cleanedMessage.length < 20) {
      toast.error("Please write at least 20 characters.");
      return;
    }

    try {
      await submitFeedback.mutateAsync({
        employee_id: employeeId,
        category,
        sentiment,
        message: cleanedMessage,
      });
      toast.success("Feedback submitted.");
      setEmployeeId("");
      setCategory(FEEDBACK_CATEGORIES[0]);
      setSentiment("neutral");
      setMessage("");
      setPage(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit feedback");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground">Create employee feedback, review entries, and track sentiment trends.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Give Feedback</CardTitle>
          <CardDescription>Create feedback for a specific employee.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="feedback-employee">Employee</Label>
              <Select value={employeeId} onValueChange={(value) => setEmployeeId(value ?? "")}>
                <SelectTrigger id="feedback-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedback-category">Category</Label>
              <Select value={category} onValueChange={(value) => setCategory((value as FeedbackCategory) ?? FEEDBACK_CATEGORIES[0])}>
                <SelectTrigger id="feedback-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="feedback-sentiment">Sentiment</Label>
              <Select value={sentiment} onValueChange={(value) => setSentiment((value as FeedbackSentiment) ?? "neutral")}>
                <SelectTrigger id="feedback-sentiment">
                  <SelectValue placeholder="Select sentiment" />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_SENTIMENTS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {SENTIMENT_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 xl:col-span-3">
              <Label htmlFor="feedback-message">Message</Label>
              <Textarea
                id="feedback-message"
                rows={5}
                maxLength={1000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write specific feedback for the employee."
              />
              <p className="text-xs text-muted-foreground">{message.length}/1000 (minimum 20 characters)</p>
            </div>

            <div className="xl:col-span-3">
              <Button type="submit" disabled={submitFeedback.isPending}>
                {submitFeedback.isPending ? "Submitting..." : "Submit feedback"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="This month"
          value={analytics?.monthStats.totalThisMonth ?? 0}
          icon={CalendarClockIcon}
          hint="Total submissions in current month"
        />
        <StatCard
          title="Unreviewed"
          value={analytics?.monthStats.unreviewedThisMonth ?? 0}
          icon={ShieldAlertIcon}
          tone="warning"
          valueClassName="text-amber-600"
          hint="Needs admin attention"
        />
        <StatCard
          title="Anonymous"
          value={analytics?.monthStats.anonymousThisMonth ?? 0}
          icon={MessageSquareIcon}
          hint="Anonymous count from older records"
        />
        <StatCard
          title="Average sentiment"
          value={`${analytics?.monthStats.sentimentPercentages.positive ?? 0}% Positive · ${analytics?.monthStats.sentimentPercentages.neutral ?? 0}% Neutral · ${analytics?.monthStats.sentimentPercentages.negative ?? 0}% Negative`}
          icon={MessageSquareIcon}
          tone="success"
          valueClassName="text-sm font-semibold sm:text-base"
          hint="Current-month sentiment split"
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line">
              <TabsTrigger value="all">All feedback</TabsTrigger>
              <TabsTrigger value="by-category">By category</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6 pt-3">
              <div className="space-y-1 xl:col-span-2">
                <Label htmlFor="feedback-search">Search</Label>
                <Input
                  id="feedback-search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search message or employee"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="feedback-category-filter">Category</Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(value ?? "ALL");
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="feedback-category-filter">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All categories</SelectItem>
                    {FEEDBACK_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="feedback-status-filter">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value ?? "ALL");
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="feedback-status-filter">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {FEEDBACK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="feedback-sentiment-filter">Sentiment</Label>
                <Select
                  value={sentimentFilter}
                  onValueChange={(value) => {
                    setSentimentFilter(value ?? "ALL");
                    setPage(1);
                  }}
                >
                  <SelectTrigger id="feedback-sentiment-filter">
                    <SelectValue placeholder="All sentiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All sentiments</SelectItem>
                    {FEEDBACK_SENTIMENTS.map((sentiment) => (
                      <SelectItem key={sentiment} value={sentiment}>
                        {SENTIMENT_LABELS[sentiment]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="feedback-date-range">Date range</Label>
                  <DateRangePicker
                    id="feedback-date-range"
                    value={{ from: dateFrom, to: dateTo }}
                    onChange={(range) => {
                      setDateFrom(range.from ?? "");
                      setDateTo(range.to ?? "");
                    }}
                    numberOfMonths={1}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <TabsContent value="all">
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Sentiment</TableHead>
                        <TableHead>Preview</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[260px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                            No feedback found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatDate(item.created_at)}</TableCell>
                            <TableCell>
                              {item.employee ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-7">
                                    <AvatarFallback>{initials(item.employee.full_name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{item.employee.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{item.employee.email}</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Unknown</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={sentimentVariant(item.sentiment)}>{SENTIMENT_LABELS[item.sentiment]}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[320px] truncate text-muted-foreground">{item.preview}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => openSheet(item)}>
                                  View full
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={item.status === "reviewed" || updateFeedback.isPending}
                                  onClick={() => quickStatusUpdate(item, "reviewed")}
                                >
                                  Mark reviewed
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={item.status === "actioned" || updateFeedback.isPending}
                                  onClick={() => quickStatusUpdate(item, "actioned")}
                                >
                                  Mark actioned
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <p className="text-xs text-muted-foreground">
                    Page {meta?.page ?? page} of {meta?.totalPages ?? 1}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(meta?.page ?? page) <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!meta?.hasNext}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="by-category" className="space-y-2">
                {categoryGroups.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No category data found.</div>
                ) : (
                  categoryGroups.map((group) => {
                    const isOpen = openCategory === group.category;
                    return (
                      <Collapsible key={group.category} open={isOpen} onOpenChange={(open) => setOpenCategory(open ? group.category : null)}>
                        <div className="rounded-lg border">
                          <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50">
                            <div>
                              <p className="text-sm font-medium">{group.category}</p>
                              <p className="text-xs text-muted-foreground">
                                {group.count} submissions · last {formatDate(group.lastSubmission)}
                              </p>
                            </div>
                            <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2 border-t p-3">
                              {group.items.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className="w-full rounded-md border p-3 text-left hover:bg-muted/40"
                                  onClick={() => openSheet(item)}
                                >
                                  <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <Badge variant={sentimentVariant(item.sentiment)}>{SENTIMENT_LABELS[item.sentiment]}</Badge>
                                    <Badge variant={statusVariant(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                                    <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{item.preview}</p>
                                </button>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Volume by Month</CardTitle>
                      <CardDescription>Last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={volumeConfig} id="feedback-volume" className="h-[180px] w-full">
                        <BarChart data={(analytics?.volumeByMonth ?? []).map((item) => ({ month: formatMonth(item.month), count: item.count }))}>
                          <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-muted/50" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                          <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={chartTooltipCursor} />
                          <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Category Distribution</CardTitle>
                      <CardDescription>Donut chart by category</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ChartContainer config={categoryConfig} id="feedback-category" className="h-[180px] w-full">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          <Pie
                            data={(analytics?.byCategory ?? []).map((item) => ({ ...item, value: item.count }))}
                            dataKey="value"
                            nameKey="category"
                            innerRadius="52%"
                            outerRadius="78%"
                            strokeWidth={2}
                          >
                            {(analytics?.byCategory ?? []).map((item, index) => (
                              <Cell key={item.category} fill={chartPalette[index % chartPalette.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border p-2 text-center">
                          <p className="text-xs text-muted-foreground">Positive</p>
                          <p className="text-lg font-semibold">{sentimentPercentages.positive}%</p>
                        </div>
                        <div className="rounded-lg border p-2 text-center">
                          <p className="text-xs text-muted-foreground">Neutral</p>
                          <p className="text-lg font-semibold">{sentimentPercentages.neutral}%</p>
                        </div>
                        <div className="rounded-lg border p-2 text-center">
                          <p className="text-xs text-muted-foreground">Negative</p>
                          <p className="text-lg font-semibold">{sentimentPercentages.negative}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardHeader>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Feedback Detail</SheetTitle>
            <SheetDescription>Update status, sentiment, and internal notes.</SheetDescription>
          </SheetHeader>

          {selected ? (
            <div className="space-y-4 overflow-y-auto px-4 pb-4">
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{selected.category}</Badge>
                  <Badge variant={sentimentVariant(selected.sentiment)}>{SENTIMENT_LABELS[selected.sentiment]}</Badge>
                  <Badge variant={statusVariant(selected.status)}>{STATUS_LABELS[selected.status]}</Badge>
                </div>
                <p className="text-sm leading-relaxed">{selected.message}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Submitted: {formatDateTime(selected.created_at)}</p>
                  <p>Employee: {selected.employee?.full_name ?? "Unknown"}</p>
                  <p>Original sentiment: {SENTIMENT_LABELS[selected.sentiment_original]}</p>
                  {selected.sentiment_overridden_at ? (
                    <p>
                      Overridden by admin {selected.sentiment_overridden_by ?? ""} at {formatDateTime(selected.sentiment_overridden_at)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sheet-status">Status</Label>
                <Select value={draftStatus} onValueChange={(value) => setDraftStatus((value as FeedbackStatus) ?? "unreviewed")}>
                  <SelectTrigger id="sheet-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sheet-sentiment">Sentiment override</Label>
                <Select value={draftSentiment} onValueChange={(value) => setDraftSentiment((value as FeedbackSentiment) ?? "neutral")}>
                  <SelectTrigger id="sheet-sentiment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_SENTIMENTS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {SENTIMENT_LABELS[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sheet-notes">Admin notes</Label>
                <Textarea
                  id="sheet-notes"
                  rows={5}
                  value={draftNotes}
                  onChange={(event) => setDraftNotes(event.target.value)}
                  placeholder="Internal notes visible to admins only"
                />
              </div>
            </div>
          ) : null}

          <SheetFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveSheet} disabled={!selected || updateFeedback.isPending}>
                {updateFeedback.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
