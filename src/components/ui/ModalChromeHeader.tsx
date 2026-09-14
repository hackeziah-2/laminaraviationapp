import { X } from "lucide-react";
import { cn } from "./utils";

type ModalChromeHeaderProps = {
  title: string;
  onClose: () => void;
  className?: string;
};

export function ModalChromeHeader({
  title,
  onClose,
  className,
}: ModalChromeHeaderProps) {
  return (
    <div
      className={cn(
        "modal-chrome-header flex items-center justify-between gap-3 px-4 py-4 sm:px-6",
        className
      )}
      style={{ backgroundColor: "#022C75" }}
    >
      <h2 className="min-w-0 flex-1 text-base font-semibold text-white sm:text-lg">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="modal-header-close"
        aria-label="Close"
      >
        <X className="h-5 w-5 text-white" aria-hidden="true" />
      </button>
    </div>
  );
}
