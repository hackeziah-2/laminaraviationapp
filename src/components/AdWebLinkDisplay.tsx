import { ExternalLink } from "lucide-react";
import { normalizeWebLink } from "../utility/utils";
import { cn } from "./ui/utils";

type AdWebLinkButtonProps = {
  webLink?: string | null;
  className?: string;
  placeholderClassName?: string;
};

/**
 * Maintenance AD — opens URL in a new tab; shows "Link" button or placeholder.
 */
export function AdWebLinkButton({
  webLink,
  className,
  placeholderClassName = "text-gray-400 text-sm",
}: AdWebLinkButtonProps) {
  const href = normalizeWebLink(webLink);
  if (!href) {
    return <span className={placeholderClassName}>No Link Available</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors",
        className
      )}
    >
      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
      Link
    </a>
  );
}

/** @deprecated Use `AdWebLinkButton` */
export const AdWebLinkDisplay = AdWebLinkButton;
