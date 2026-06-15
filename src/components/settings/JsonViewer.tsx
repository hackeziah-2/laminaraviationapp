import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

const MAX_PREVIEW_CHARS = 120;

function previewValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return value.length > MAX_PREVIEW_CHARS
      ? `${value.slice(0, MAX_PREVIEW_CHARS)}…`
      : value;
  }
  const json = JSON.stringify(value);
  return json.length > MAX_PREVIEW_CHARS
    ? `${json.slice(0, MAX_PREVIEW_CHARS)}…`
    : json;
}

function JsonNode({
  label,
  value,
  depth = 0,
}: {
  label: string;
  value: unknown;
  depth?: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isObject =
    value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);

  if (!isObject && !isArray) {
    return (
      <div
        className="flex flex-wrap gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
        style={{ marginLeft: depth * 12 }}
      >
        <span className="font-medium text-gray-600">{label}:</span>
        <span className="break-all font-mono text-gray-800">
          {previewValue(value)}
        </span>
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div style={{ marginLeft: depth * 12 }}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-gray-100 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
          )}
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-xs text-gray-400">
            {isArray ? `[${entries.length}]` : `{${entries.length}}`}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-1 space-y-1 pl-1">
          {entries.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">Empty</div>
          ) : (
            entries.map(([key, child]) => (
              <JsonNode
                key={`${label}-${key}`}
                label={key}
                value={child}
                depth={depth + 1}
              />
            ))
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function JsonViewer({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  const sections = useMemo(
    () => [
      { label: "old_data", value: oldData ?? {} },
      { label: "new_data", value: newData ?? {} },
    ],
    [oldData, newData]
  );

  return (
    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
      {sections.map((section) => (
        <JsonNode
          key={section.label}
          label={section.label}
          value={section.value}
          depth={0}
        />
      ))}
    </div>
  );
}
