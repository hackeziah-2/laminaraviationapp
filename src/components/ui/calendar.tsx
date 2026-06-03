"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation, type CaptionProps } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { cn } from "./utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: new Date(2000, i, 1).toLocaleString("en-GB", { month: "long" }),
}));

function buildYearRange(center: number, span = 80): number[] {
  const start = center - span;
  const end = center + 10;
  const years: number[] = [];
  for (let y = start; y <= end; y += 1) years.push(y);
  return years;
}

function CalendarCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, previousMonth, nextMonth } = useNavigation();
  const years = React.useMemo(
    () => buildYearRange(displayMonth.getFullYear()),
    [displayMonth]
  );

  const goToMonthYear = (monthIndex: number, year: number) => {
    goToMonth(new Date(year, monthIndex, 1));
  };

  return (
    <div className="flex w-full items-center justify-between gap-1 px-0.5">
      <button
        type="button"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors",
          "hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
          "disabled:pointer-events-none disabled:opacity-30"
        )}
        aria-label="Previous month"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        <select
          aria-label="Month"
          value={displayMonth.getMonth()}
          onChange={(e) =>
            goToMonthYear(Number(e.target.value), displayMonth.getFullYear())
          }
          className="h-8 max-w-[7.5rem] flex-1 truncate rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={displayMonth.getFullYear()}
          onChange={(e) =>
            goToMonthYear(displayMonth.getMonth(), Number(e.target.value))
          }
          className="h-8 w-[5.25rem] rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors",
          "hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
          "disabled:pointer-events-none disabled:opacity-30"
        )}
        aria-label="Next month"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("rdp-laminar", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        caption: "relative mb-1 flex justify-center",
        caption_label: "sr-only",
        nav: "hidden",
        nav_button: "hidden",
        nav_button_previous: "hidden",
        nav_button_next: "hidden",
        table: "mx-auto w-full border-collapse",
        head_cell:
          "text-[0.7rem] font-semibold uppercase tracking-wide text-gray-400",
        cell: "p-0 text-center",
        day: cn(
          "rdp-day rounded-lg text-sm font-medium text-gray-800",
          "hover:bg-blue-50 hover:text-blue-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        ),
        day_selected:
          "rdp-day_selected !bg-blue-600 !text-white shadow-sm hover:!bg-blue-600 hover:!text-white",
        day_today:
          "rdp-day_today !bg-blue-50 !font-semibold !text-blue-700 ring-1 ring-inset ring-blue-200",
        day_outside: "rdp-day_outside text-gray-300 opacity-60",
        day_disabled: "rdp-day_disabled text-gray-300 opacity-40",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: CalendarCaption,
        IconLeft: () => null,
        IconRight: () => null,
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
