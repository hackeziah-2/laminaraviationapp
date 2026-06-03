"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "./calendar";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";
import { cn } from "./utils";
import {
  DISPLAY_DATE_FORMAT_HINT,
  DISPLAY_DATE_PLACEHOLDER,
  apiDateToDisplay,
  formatDateForApi,
  formatDisplayDate,
  isCompleteDisplayDate,
  normalizeDateInputText,
  parseDisplayDate,
} from "../../utility/utils";

export type DateInputProps = {
  /** Storage value: YYYY-MM-DD (API / database). */
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  inputClassName?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  title?: string;
  showFormatHint?: boolean;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toApiFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatPickerHeading(date: Date | undefined): {
  title: string;
  subtitle: string;
} {
  if (!date) {
    return { title: "Select date", subtitle: DISPLAY_DATE_PLACEHOLDER };
  }
  return {
    title: date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    subtitle: apiDateToDisplay(toApiFromDate(date)),
  };
}

export function DateInput({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  className,
  inputClassName,
  name,
  id,
  placeholder = DISPLAY_DATE_PLACEHOLDER,
  min,
  max,
  required,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  title = DISPLAY_DATE_FORMAT_HINT,
  showFormatHint = false,
}: DateInputProps) {
  const apiValue = formatDateForApi(value ?? "");
  const [text, setText] = React.useState(() => apiDateToDisplay(apiValue));
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(() => {
    const d = parseDisplayDate(apiValue);
    return d ? startOfDay(d) : new Date();
  });
  const skipBlurCommitRef = React.useRef(false);
  const skipPopoverCloseCommitRef = React.useRef(false);
  const isEditingRef = React.useRef(false);
  const hintId = React.useId();

  React.useEffect(() => {
    if (isEditingRef.current) return;
    const next = apiDateToDisplay(formatDateForApi(value ?? ""));
    setText(next);
    const d = parseDisplayDate(formatDateForApi(value ?? ""));
    if (d) setMonth(startOfDay(d));
  }, [value]);

  const selectedDate = React.useMemo(() => {
    const d = parseDisplayDate(apiValue);
    return d ? startOfDay(d) : undefined;
  }, [apiValue]);

  const pickerHeading = React.useMemo(
    () => formatPickerHeading(selectedDate),
    [selectedDate]
  );

  const minDate = React.useMemo(
    () => (min ? parseDisplayDate(min) : undefined),
    [min]
  );
  const maxDate = React.useMemo(
    () => (max ? parseDisplayDate(max) : undefined),
    [max]
  );

  const isDayDisabled = React.useCallback(
    (date: Date) => {
      const day = startOfDay(date);
      if (minDate && day < startOfDay(minDate)) return true;
      if (maxDate && day > startOfDay(maxDate)) return true;
      return false;
    },
    [minDate, maxDate]
  );

  const applyApiValue = (nextApi: string) => {
    onChange(nextApi);
    setText(apiDateToDisplay(nextApi));
    const d = parseDisplayDate(nextApi);
    if (d) setMonth(startOfDay(d));
  };

  const openPicker = () => {
    if (disabled || readOnly) return;
    skipBlurCommitRef.current = true;
    if (selectedDate) setMonth(selectedDate);
    setOpen(true);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    skipPopoverCloseCommitRef.current = true;
    applyApiValue(toApiFromDate(date));
    isEditingRef.current = false;
    setOpen(false);
  };

  const isApiDateInRange = (nextApi: string): boolean => {
    const d = parseDisplayDate(nextApi);
    if (!d) return false;
    const day = startOfDay(d);
    if (minDate && day < startOfDay(minDate)) return false;
    if (maxDate && day > startOfDay(maxDate)) return false;
    return true;
  };

  const commitText = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      applyApiValue("");
      return;
    }
    const nextApi = formatDateForApi(trimmed);
    if (nextApi && isApiDateInRange(nextApi)) {
      applyApiValue(nextApi);
    } else {
      setText(apiDateToDisplay(formatDateForApi(value ?? "")));
    }
  };

  const handleTextChange = (raw: string) => {
    const next = normalizeDateInputText(raw);
    setText(next);
    if (!isCompleteDisplayDate(next)) return;
    const nextApi = formatDateForApi(next);
    if (nextApi && isApiDateInRange(nextApi)) {
      onChange(nextApi);
      const d = parseDisplayDate(nextApi);
      if (d) setMonth(startOfDay(d));
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (!skipPopoverCloseCommitRef.current) {
        commitText();
        isEditingRef.current = false;
      }
      skipPopoverCloseCommitRef.current = false;
      window.setTimeout(() => {
        skipBlurCommitRef.current = false;
      }, 0);
    }
    setOpen(next);
  };

  const hasValue = Boolean(apiValue);
  const describedBy =
    [ariaDescribedBy, showFormatHint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          <div
            className={cn(
              "group flex h-10 w-full overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-200",
              open
                ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                : "border-gray-300 hover:border-gray-400",
              ariaInvalid && "border-red-500 ring-2 ring-red-500/15",
              disabled && "cursor-not-allowed opacity-60 bg-gray-50",
              readOnly && "bg-gray-50"
            )}
          >
            {name ? (
              <input type="hidden" name={name} value={apiValue} readOnly />
            ) : null}

            <div className="relative flex min-w-0 flex-1 items-center">
              <input
                type="text"
                id={id}
                data-slot="date-input"
                inputMode="numeric"
                autoComplete="off"
                placeholder={placeholder}
                value={text}
                readOnly={readOnly}
                disabled={disabled}
                required={required}
                title={title}
                aria-invalid={ariaInvalid}
                aria-describedby={describedBy}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={`Date (${DISPLAY_DATE_PLACEHOLDER})`}
                onChange={(e) => {
                  if (readOnly || disabled) return;
                  handleTextChange(e.target.value);
                }}
                onFocus={() => {
                  isEditingRef.current = true;
                }}
                onBlur={() => {
                  if (skipBlurCommitRef.current) return;
                  commitText();
                  isEditingRef.current = false;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitText();
                    setOpen(false);
                  }
                  if (e.key === "Escape") setOpen(false);
                }}
                className={cn(
                  "h-full w-full min-w-0 border-0 bg-transparent py-2 pl-3 pr-2 text-sm font-medium tracking-wide text-gray-900 outline-none",
                  "placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400",
                  !readOnly && !disabled && "cursor-text",
                  readOnly && "cursor-default",
                  inputClassName
                )}
              />
              {hasValue && !readOnly && !disabled && (
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    applyApiValue("");
                  }}
                  className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Clear date"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {!readOnly && (
              <button
                type="button"
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  openPicker();
                }}
                className={cn(
                  "flex h-full w-11 shrink-0 items-center justify-center border-l transition-colors duration-200",
                  open
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-gray-50 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                )}
                aria-label="Open date picker"
                tabIndex={-1}
              >
                <CalendarIcon className="size-4" strokeWidth={2} aria-hidden />
              </button>
            )}

            {readOnly && (
              <div className="flex h-full w-11 shrink-0 items-center justify-center border-l border-gray-200 bg-gray-100 text-gray-400">
                <CalendarIcon className="size-4" aria-hidden />
              </div>
            )}
          </div>
        </PopoverAnchor>

        {!readOnly && (
          <PopoverContent
            className="w-auto min-w-[17.5rem] overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-xl"
            align="start"
            sideOffset={6}
            style={{ zIndex: 10050 }}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {/* <div className="border-b border-blue-500/20 bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-3 text-white">
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-blue-100/90">
                {selectedDate ? "Selected" : "Choose date"}
              </p>
              <p className="mt-0.5 truncate text-base font-semibold leading-snug">
                {pickerHeading.title}
              </p>
              <p className="mt-1 text-xs font-medium text-blue-100">
                {pickerHeading.subtitle}
              </p>
            </div> */}

            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              disabled={isDayDisabled}
              initialFocus
              className="bg-white px-3 pb-3 pt-2"
            />

            <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/80 px-3 py-2.5">
              <button
                type="button"
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => {
                  const today = startOfDay(new Date());
                  if (!isDayDisabled(today)) {
                    handleCalendarSelect(today);
                  }
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={() => {
                  applyApiValue("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
            </div>
          </PopoverContent>
        )}
      </Popover>

      {showFormatHint && !readOnly && (
        <p
          id={hintId}
          className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500"
        >
          <CalendarIcon className="size-3 shrink-0 opacity-60" aria-hidden />
          {DISPLAY_DATE_FORMAT_HINT}
        </p>
      )}
    </div>
  );
}

/** Read-only DD/MM/YYYY text (tables, detail rows). */
export function DateDisplay({
  value,
  fallback = "-",
  className,
}: {
  value?: string | null;
  fallback?: string;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums text-gray-900", className)}>
      {formatDisplayDate(value, { fallback })}
    </span>
  );
}
