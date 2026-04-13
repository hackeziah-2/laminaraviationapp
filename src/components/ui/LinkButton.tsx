import { ExternalLink } from "lucide-react";
import { cn } from "./utils";

export interface LinkButtonProps {
  href: string;
  className?: string;
}

/**
 * Button-styled external link showing "LINK" with icon. Used in regulatory-compliance modules.
 */
export function LinkButton({ href, className }: LinkButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors",
        className
      )}
    >
      LINK
    </a>
  );
}
