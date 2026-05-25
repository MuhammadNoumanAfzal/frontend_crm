"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod/v4";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateRangePicker, type DateRangeValue } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useLeavePreviewMutation,
  useLeaveRequestMutation,
  useMyLeaveBalanceQuery,
  usePublicHolidaysQuery,
} from "@/lib/query/hooks";
import { sanitizeText } from "@/lib/utils/sanitize";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const leaveSchema = z.object({
  type: z.string().min(1),
  reason: z.string().max(400).optional(),
  is_paid: z.boolean(),
});

type LeaveInput = z.infer<typeof leaveSchema>;

const leaveTypes = ["ANNUAL", "SICK", "UNPAID", "MATERNITY", "PATERNITY", "EMERGENCY"] as const;

function toUtcIsoStartOfDay(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)).toISOString();
}

function toUtcIsoEndOfDay(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)).toISOString();
}

function countWorkingDaysInRange(
  from: string,
  to: string,
  holidayMatchers: Set<string>
) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let total = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (day !== 0 && day !== 6 && !holidayMatchers.has(key)) {
      total += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

export function LeaveRequestForm({ onSuccess }: { onSuccess?: () => void }) {
  const mutation = useLeaveRequestMutation();
  const { mutateAsync: previewLeave } = useLeavePreviewMutation();
  const leaveBalance = useMyLeaveBalanceQuery();
  const holidays = usePublicHolidaysQuery(new Date().getUTCFullYear());

  const [range, setRange] = useState<DateRangeValue>({ from: "", to: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ working_days: number; excess_days: number; estimated_excess_deduction: string | null } | null>(null);

  const form = useForm<LeaveInput>({
    defaultValues: {
      type: "ANNUAL",
      reason: "",
      is_paid: true,
    },
  });

  const typeWatch = useWatch({ control: form.control, name: "type" }) ?? "ANNUAL";
  const isPaidWatch = useWatch({ control: form.control, name: "is_paid" }) ?? true;

  const holidayMatchers = useMemo(() => {
    const set = new Set<string>();
    for (const h of holidays.data ?? []) {
      const d = new Date(h.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      set.add(key);
    }
    return set;
  }, [holidays.data]);

  useEffect(() => {
    if (!range.from || !range.to) {
      return;
    }
    const startDate = new Date(`${range.from}T00:00:00`);
    const endDate = new Date(`${range.to}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return;
    }

    const start = toUtcIsoStartOfDay(startDate);
    const end = toUtcIsoEndOfDay(endDate);
    const t = setTimeout(() => {
      previewLeave({ start_date: start, end_date: end, type: typeWatch, is_paid: isPaidWatch })
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 320);
    return () => clearTimeout(t);
  }, [range.from, range.to, typeWatch, isPaidWatch, previewLeave]);

  const selectedWorkingDays =
    range.from && range.to
      ? countWorkingDaysInRange(range.from, range.to, holidayMatchers)
      : 0;

  const requiresSupportingDocument =
    typeWatch === "MATERNITY" ||
    typeWatch === "EMERGENCY" ||
    (typeWatch === "SICK" && selectedWorkingDays > 1);

  function disabledDays(d: Date) {
    const day = d.getDay();
    if (day === 0 || day === 6) return true;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return holidayMatchers.has(key);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!range.from || !range.to) {
      toast.error("Select a date range");
      return;
    }
    const parsed = leaveSchema.safeParse(values);
    if (!parsed.success) {
      toast.error("Check the form");
      return;
    }

    if (parsed.data.type === "SICK" && (!parsed.data.reason || parsed.data.reason.trim().length === 0)) {
      toast.error("Reason is required for sick leave");
      return;
    }
    if (requiresSupportingDocument && !file) {
      toast.error("Supporting document is required for maternity, emergency, and sick leave longer than 1 working day");
      return;
    }

    try {
      const startDate = toUtcIsoStartOfDay(new Date(`${range.from}T00:00:00`));
      const endDate = toUtcIsoEndOfDay(new Date(`${range.to}T00:00:00`));

      await mutation.mutateAsync({
        ...parsed.data,
        start_date: startDate,
        end_date: endDate,
        reason: parsed.data.reason ? sanitizeText(parsed.data.reason) : undefined,
        is_paid: parsed.data.is_paid,
        supporting_file: file,
      });
      toast.success("Leave request submitted");
      form.reset({ type: "ANNUAL", reason: "", is_paid: true });
      setRange({ from: "", to: "" });
      setFile(null);
      setPreview(null);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to submit leave request");
    }
  });

  const entry = leaveBalance.data?.[typeWatch];
  const remaining = entry?.remainingDays;
  const limit = entry?.limitDays;

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="rounded-lg border bg-card/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Your leave balance ({typeWatch})</p>
          {leaveBalance.isLoading ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
        </div>

        {leaveBalance.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Limit</span>
              <span className="font-medium">
                {limit == null ? "—" : `${limit} days`}
                {entry?.isCustomLimit ? (
                  <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-400">Custom</span>
                ) : null}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Used (approved)</span>
              <span>{entry?.usedApprovedDays ?? 0}d</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Pending</span>
              <span>{entry?.pendingDays ?? 0}d</span>
            </div>
            {remaining != null && limit != null && limit > 0 ? (
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className={remaining <= 0 ? "font-semibold text-destructive" : "font-medium"}>
                    {remaining}d
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary transition-all",
                      remaining <= 0 && "bg-destructive",
                    )}
                    style={{ width: `${Math.min(100, Math.round((remaining / limit) * 100))}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Date range</Label>
        <DateRangePicker
          value={range}
          onChange={setRange}
          numberOfMonths={typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 2}
          disabledDates={disabledDays}
        />
      </div>

      {preview && range.from && range.to ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p>
            This request uses <strong>{preview.working_days}</strong> working day(s).
            {remaining != null ? (
              <>
                {" "}
                You have <strong>{remaining}</strong> day(s) remaining before this request.
              </>
            ) : null}
          </p>
          {preview.excess_days > 0 ? (
            <Alert variant="destructive" className="mt-3">
              <AlertTitle>Exceeds your limit</AlertTitle>
              <AlertDescription>
                {preview.excess_days} excess day(s) may be deducted from salary
                {preview.estimated_excess_deduction
                  ? ` (estimated −${preview.estimated_excess_deduction})`
                  : ""}
                .
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Leave type</Label>
        <Select
          value={typeWatch}
          onValueChange={(value) => {
            if (!value) return;
            form.setValue("type", value);
            if (value === "UNPAID") form.setValue("is_paid", false);
            else form.setValue("is_paid", true);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason / notes</Label>
        <Textarea
          id="reason"
          rows={3}
          placeholder={typeWatch === "SICK" ? "Required for sick leave" : "Optional"}
          {...form.register("reason")}
        />
      </div>

      {requiresSupportingDocument && (
        <div className="space-y-2">
          <Label htmlFor="support">Supporting document</Label>
          <InputFile id="support" onFile={setFile} />
        </div>
      )}

      <Button type="submit" disabled={mutation.isPending || leaveBalance.isLoading}>
        {mutation.isPending ? "Submitting..." : leaveBalance.isLoading ? "Loading balance..." : "Submit request"}
      </Button>
    </form>
  );
}

function InputFile({ id, onFile }: { id: string; onFile: (f: File | null) => void }) {
  return (
    <input
      id={id}
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
      className="text-sm file:mr-2 file:rounded-md file:border file:bg-muted file:px-3 file:py-1"
      onChange={(e) => onFile(e.target.files?.[0] ?? null)}
    />
  );
}
