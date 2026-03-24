import { Loader } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./utils";

const sizeClass = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-10 h-10",
} as const;

export type SpinnerSize = keyof typeof sizeClass;

type SpinnerIconProps = {
  size?: SpinnerSize;
  className?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
};

/** Lucide `Loader` — use inline (buttons, inputs) or inside custom layouts. */
export function SpinnerIcon({
  size = "md",
  className,
  "aria-label": ariaLabel = "Loading",
  "aria-hidden": ariaHidden,
}: SpinnerIconProps) {
  return (
    <Loader
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : ariaLabel}
      role={ariaHidden ? undefined : "status"}
      className={cn("shrink-0 animate-spin text-blue-600", sizeClass[size], className)}
    />
  );
}

type SpinnerProps = {
  /** Message below the icon */
  label?: ReactNode;
  size?: SpinnerSize;
  /** Extra classes on the outer flex wrapper */
  className?: string;
  /** Omit default vertical padding (parent already centers / pads) */
  compact?: boolean;
};

/** Centered block spinner for panels, tables, and modals. */
export function Spinner({
  label,
  size = "lg",
  className,
  compact = false,
}: SpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        !compact && "py-4",
        className
      )}
    >
      <SpinnerIcon
        size={size}
        aria-hidden={label != null}
        aria-label={label != null ? undefined : "Loading"}
      />
      {label != null ? (
        <span className="text-center text-sm text-gray-500">{label}</span>
      ) : null}
    </div>
  );
}
