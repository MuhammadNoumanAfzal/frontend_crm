"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function parseDateInput(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDateLabel(value?: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)) {
    return format(new Date(year, month - 1, day), "dd MMM yyyy");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "dd MMM yyyy");
}

function toDateInput(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateInput(value), [value]);
  const displayValue = useMemo(() => formatDateLabel(value), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          "inline-flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-1.25 text-left text-sm shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !displayValue && "text-muted-foreground",
          className,
        )}
      >
        <span className="flex items-center truncate">
          <CalendarIcon className="mr-2 size-4" />
          {displayValue || placeholder}
        </span>
        <ChevronDownIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(date ? toDateInput(date) : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
