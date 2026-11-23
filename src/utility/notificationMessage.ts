import type { Notification } from "../types/notification";

const AIRCRAFT_REGISTRATION_PATTERN = /\b[A-Z]{2}-[A-Z]\d{4}\b/g;

function extractAircraftRegistrations(message: string): string[] {
  return [...new Set(message.match(AIRCRAFT_REGISTRATION_PATTERN) ?? [])];
}

function normalizeMessagePrefix(prefix: string): string {
  return prefix
    .replace(/\s+for\s+aircraft\s*$/i, "")
    .replace(/\s+was\s+updated\s*$/i, "")
    .replace(/\s+updated\s*$/i, "")
    .trim();
}

/**
 * Compacts long aircraft-registration lists in notification messages for UI display.
 * Example: "... RP-C5891, RP-C6309, RP-C6476 and 7 more aircraft."
 */
export function formatNotificationMessage(
  message: string,
  maxVisible = 3
): string {
  const registrations = extractAircraftRegistrations(message);
  if (registrations.length <= maxVisible) {
    return message;
  }

  const firstRegIndex = message.indexOf(registrations[0]);
  const prefix = normalizeMessagePrefix(message.slice(0, firstRegIndex).trimEnd());
  const visible = registrations.slice(0, maxVisible).join(", ");
  const remaining = registrations.length - maxVisible;

  if (!prefix) {
    return `Updated for ${visible} and ${remaining} more aircraft.`;
  }

  return `${prefix} updated for ${visible} and ${remaining} more aircraft.`;
}

function atlSequenceNumber(notification: Notification): string {
  const metadata = notification.metadata ?? notification.notification_metadata ?? null;
  const sequence =
    notification.sequence_no ??
    metadata?.sequence_no ??
    (metadata?.sequenceNo as string | number | undefined);
  if (sequence == null) return "";
  return String(sequence).trim();
}

function isAtlNotification(notification: Notification): boolean {
  const moduleName = notification.module_name?.trim().toLowerCase();
  return (
    moduleName === "atl" ||
    moduleName === "alt" ||
    moduleName === "logbook" ||
    notification.reference_type === "ATL"
  );
}

/** Short label for the selected notification. ATL rows use the sequence number. */
export function formatSelectedNotificationLabel(notification: Notification): string {
  if (!isAtlNotification(notification)) return notification.title;
  const sequence = atlSequenceNumber(notification);
  return sequence ? `ATL #${sequence}` : notification.title;
}

export function formatNotificationMessageCountOnly(message: string): string {
  const registrations = extractAircraftRegistrations(message);
  if (registrations.length <= 3) {
    return message;
  }

  const firstRegIndex = message.indexOf(registrations[0]);
  const prefix = normalizeMessagePrefix(message.slice(0, firstRegIndex).trimEnd());
  const count = registrations.length;

  if (!prefix) {
    return `Updated for ${count} aircraft.`;
  }

  return `${prefix} updated for ${count} aircraft.`;
}
