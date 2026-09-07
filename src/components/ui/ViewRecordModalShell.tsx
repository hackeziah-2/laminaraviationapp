import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Spinner } from "./spinner";
import { ModalRecordNav } from "./ModalRecordNav";

type ViewRecordModalShellProps = {
  children: ReactNode;
  onClose: () => void;
  onPrevious: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
  hasPrevious: boolean;
  hasNext: boolean;
  navigating?: boolean;
  scrollKey: string | number;
};

export function ViewRecordModalShell({
  children,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  navigating = false,
  scrollKey,
}: ViewRecordModalShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center py-4 pl-14 pr-14 sm:pl-16 sm:pr-16"
      style={{
        background: "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(4px)",
      }}
    >
      <ModalRecordNav
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        disabled={navigating}
      />
      <div
        ref={scrollRef}
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white"
      >
        {navigating ? (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm"
            aria-live="polite"
            aria-busy="true"
          >
            <Spinner label="Loading entry…" compact />
          </div>
        ) : null}
        <div className="sticky top-0 z-30 flex items-center justify-end border-b border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
