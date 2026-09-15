import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { isEditableKeyboardTarget } from "./isEditableKeyboardTarget";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export const PREVIOUS_SEQUENCE_LABEL = "Previous Sequence";
export const NEXT_SEQUENCE_LABEL = "Next Sequence";

type ModalRecordNavProps = {
  onPrevious: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  hasPrevious: boolean;
  hasNext: boolean;
  disabled?: boolean;
  enableKeyboard?: boolean;
};

const buttonBaseClass =
  "modal-record-nav-btn rounded-full border-2 border-gray-300 bg-white text-gray-800 shadow-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

function navEnabledClass(enabled: boolean) {
  return enabled
    ? "hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
    : "cursor-not-allowed opacity-40";
}

function SequenceNavButton({
  label,
  enabled,
  onClick,
  side,
  icon,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
  side: "left" | "right";
  icon: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`modal-record-nav ${
            side === "left" ? "modal-record-nav--left" : "modal-record-nav--right"
          }`}
        >
          <button
            type="button"
            className={`${buttonBaseClass} ${navEnabledClass(enabled)}`}
            aria-label={label}
            title={label}
            disabled={!enabled}
            onClick={onClick}
          >
            {icon}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side === "left" ? "right" : "left"}
        sideOffset={8}
        className="z-[120] bg-gray-900 text-white"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Previous/Next controls for a view-entry modal. Parent overlay must be
 * `position: relative` (e.g. `fixed inset-0`) so the buttons sit in the side gutters.
 */
export function ModalRecordNav({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  disabled = false,
  enableKeyboard = true,
}: ModalRecordNavProps) {
  const prevEnabled = hasPrevious && !disabled;
  const nextEnabled = hasNext && !disabled;

  useEffect(() => {
    if (!enableKeyboard) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (
        document.querySelector(
          "[data-nested-overlay], .swal2-container, .swal2-shown, .atl-dropdown-panel"
        )
      ) {
        return;
      }
      if (
        isEditableKeyboardTarget(event.target) ||
        isEditableKeyboardTarget(document.activeElement)
      ) {
        return;
      }

      event.preventDefault();
      if (event.key === "ArrowLeft") {
        if (!prevEnabled) return;
        void onPrevious();
        return;
      }
      if (!nextEnabled) return;
      void onNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableKeyboard, onPrevious, onNext, prevEnabled, nextEnabled]);

  return (
    <>
      <SequenceNavButton
        label={PREVIOUS_SEQUENCE_LABEL}
        enabled={prevEnabled}
        side="left"
        onClick={() => void onPrevious()}
        icon={<ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />}
      />
      <SequenceNavButton
        label={NEXT_SEQUENCE_LABEL}
        enabled={nextEnabled}
        side="right"
        onClick={() => void onNext()}
        icon={
          <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        }
      />
    </>
  );
}
