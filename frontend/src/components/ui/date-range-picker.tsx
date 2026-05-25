"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DateRangeValue = {
    from?: string;
    to?: string;
};

type DateRangePickerProps = {
    value: DateRangeValue;
    onChange: (value: DateRangeValue) => void;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    numberOfMonths?: number;
    disabledDates?: React.ComponentProps<typeof Calendar>["disabled"];
};

function parseDateInput(value?: string) {
    if (!value) return undefined;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDateInput(date: Date) {
    return format(date, "yyyy-MM-dd");
}

export function DateRangePicker({
    value,
    onChange,
    id,
    placeholder = "Pick a date range",
    disabled,
    className,
    numberOfMonths = 2,
    disabledDates,
}: DateRangePickerProps) {
    const [open, setOpen] = useState(false);

    const selectedRange = useMemo<DateRange | undefined>(() => {
        const from = parseDateInput(value.from);
        const to = parseDateInput(value.to);
        if (!from && !to) return undefined;
        return { from, to };
    }, [value.from, value.to]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger>
                <Button
                    type="button"
                    variant="outline"
                    id={id}
                    disabled={disabled}
                    className={cn("w-full justify-start px-2.5 font-normal", className)}
                >
                    <CalendarIcon data-icon="inline-start" className="size-4" />
                    {selectedRange?.from ? (
                        selectedRange.to ? (
                            <>
                                {format(selectedRange.from, "LLL dd, y")} - {format(selectedRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(selectedRange.from, "LLL dd, y")
                        )
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="range"
                    defaultMonth={selectedRange?.from}
                    selected={selectedRange}
                    onSelect={(range) => {
                        onChange({
                            from: range?.from ? toDateInput(range.from) : "",
                            to: range?.to ? toDateInput(range.to) : "",
                        });
                        if (range?.from && range?.to) {
                            setOpen(false);
                        }
                    }}
                    numberOfMonths={numberOfMonths}
                    disabled={disabledDates}
                />
            </PopoverContent>
        </Popover>
    );
}
