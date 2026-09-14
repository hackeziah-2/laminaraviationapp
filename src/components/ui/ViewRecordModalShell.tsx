import { useEffect, useRef, type ReactNode } from "react";
import { Spinner } from "./spinner";
import { ModalRecordNav } from "./ModalRecordNav";
import { ModalChromeHeader } from "./ModalChromeHeader";
import { useOverlayEscape } from "../../hooks/useOverlayEscape";

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

  useOverlayEscape({ enabled: true, onClose });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  return (
    <div
      className="modal-responsive-overlay modal-responsive-overlay--nav fixed inset-0 z-50 flex items-center justify-center"
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
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg modal-navy-shell modal-responsive-dialog"
        style={{ backgroundColor: "#022C75" }}
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
        <ModalChromeHeader
          title="View Entry"
          onClose={onClose}
          className="sticky top-0 z-30"
        />
        {children}
      </div>
    </div>
  );
}
