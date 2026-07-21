import type {
  Notification,
  NotificationListStatus,
  NotificationMetadata,
  NotificationPagedResponse,
  UnreadCountResponse,
  WebSocketNotificationEvent,
} from "../types/notification";
import { getApiOrigin } from "../utility/apiOrigin";
import {
  normalizeTechnicalLogbookNavigatePath,
  resolveTechnicalLogbookAtlRoute,
} from "../utility/technicalLogbookRoute";

const { httpBase: API_BASE, wsBase: WS_BASE } = getApiOrigin();

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getRecipientAccountFromToken(token: string): number | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { sub?: string | number };
    const id = Number(payload.sub);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

async function handleJsonResponse<T>(
  res: Response,
  message: string
): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_username");
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(message);
  return (await res.json()) as T;
}

export async function fetchNotifications(
  token: string,
  params: {
    status?: NotificationListStatus;
    page?: number;
    limit?: number;
  } = {}
) {
  const status = params.status ?? "all";
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const recipientAccount = getRecipientAccountFromToken(token);
  const query = new URLSearchParams({
    status,
    page: String(page),
    limit: String(limit),
  });
  if (recipientAccount) {
    query.set("recipient_account", String(recipientAccount));
  }
  const url = `${API_BASE}/notifications?${query.toString()}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  return handleJsonResponse<NotificationPagedResponse>(
    res,
    "Failed to fetch notifications"
  );
}

export async function fetchUnreadCount(token: string) {
  const recipientAccount = getRecipientAccountFromToken(token);
  const query = new URLSearchParams();
  if (recipientAccount) {
    query.set("recipient_account", String(recipientAccount));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const url = `${API_BASE}/notifications/unread-count${suffix}`;
  const res = await fetch(url, {
    headers: authHeaders(token),
  });
  return handleJsonResponse<UnreadCountResponse>(
    res,
    "Failed to fetch unread count"
  );
}

export async function markNotificationRead(token: string, id: number) {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return handleJsonResponse<Notification>(
    res,
    "Failed to mark notification as read"
  );
}

export async function markAllNotificationsRead(token: string) {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return handleJsonResponse<{ updated_count: number }>(
    res,
    "Failed to mark all as read"
  );
}

export async function clearAllNotifications(token: string) {
  const res = await fetch(`${API_BASE}/notifications/clear-all`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return handleJsonResponse<{ archived_count: number }>(
    res,
    "Failed to clear notifications"
  );
}

export async function archiveNotification(token: string, id: number) {
  const res = await fetch(`${API_BASE}/notifications/${id}/archive`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return handleJsonResponse<Notification>(
    res,
    "Failed to archive notification"
  );
}

function getNotificationMetadata(
  notification: Notification
): NotificationMetadata | null {
  return notification.metadata ?? notification.notification_metadata ?? null;
}

function normalizeNotificationNavigatePath(url: string): string | null {
  const normalized = normalizeTechnicalLogbookNavigatePath(url);
  if (normalized) return normalized;

  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return null;
  }

  return `/${trimmed.replace(/^\/+/, "")}`;
}

function extractTechnicalLogbookAtlRouteArgs(notification: Notification) {
  const metadata = getNotificationMetadata(notification);

  return {
    sequenceNo:
      notification.sequence_no ??
      metadata?.sequence_no ??
      (metadata?.sequenceNo as string | number | undefined),
    aircraftId:
      notification.aircraft_id ??
      metadata?.aircraft_id ??
      metadata?.aircraft_fk,
    atlBatchFk:
      notification.atl_batch ??
      metadata?.atl_batch_fk ??
      metadata?.atl_batch ??
      (notification.reference_type === "ATL"
        ? notification.reference_id
        : undefined),
  };
}

function isTechnicalLogbookNotificationModule(
  moduleName: string | undefined
): boolean {
  return (
    moduleName === "atl" ||
    moduleName === "alt" ||
    moduleName === "logbook"
  );
}

export function getNotificationRoute(
  notification: Notification
): string | null {
  const moduleName = notification.module_name?.trim().toLowerCase();

  // Enforce direct navigation for Fleet Daily Update notifications.
  if (moduleName === "daily-update") return "/daily-update";

  const metadata = getNotificationMetadata(notification);
  const metadataUrl =
    typeof metadata?.url === "string" ? metadata.url.trim() : "";
  const atlRouteArgs = extractTechnicalLogbookAtlRouteArgs(notification);
  const targetsTechnicalLogbook =
    isTechnicalLogbookNotificationModule(moduleName) ||
    notification.reference_type === "ATL" ||
    metadataUrl.includes("/technical-logbook");

  if (targetsTechnicalLogbook) {
    return resolveTechnicalLogbookAtlRoute(
      metadataUrl.includes("/technical-logbook") ? metadataUrl : undefined,
      atlRouteArgs
    );
  }

  if (metadataUrl) {
    const path = normalizeNotificationNavigatePath(metadataUrl);
    if (path) return path;
  }

  if (notification.reference_type === "AIRCRAFT" && notification.reference_id) {
    return `/profile/${notification.reference_id}`;
  }

  // Fallback route map by module name when reference metadata is incomplete.
  if (moduleName === "profile" || moduleName === "aircraft") return "/profile";
  if (moduleName === "dashboard") return "/dashboard";
  if (moduleName === "operation") return "/profile";
  if (moduleName === "maintenance") return "/profile";
  if (moduleName === "settings") return "/settings";
  if (moduleName === "regulatory-compliance") {
    return "/regulatory-compliance/advisory";
  }
  return null;
}

export function connectNotificationSocket(
  token: string,
  handlers: {
    onNewNotification?: (
      event: Extract<WebSocketNotificationEvent, { event: "new_notification" }>
    ) => void;
    onUnreadCountUpdated?: (unreadCount: number) => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
    onOpen?: () => void;
  }
) {
  const ws = new WebSocket(
    `${WS_BASE}/notifications/ws?token=${encodeURIComponent(token)}`
  );

  ws.onopen = () => handlers.onOpen?.();
  ws.onmessage = (event) => {
    const payload = JSON.parse(event.data) as WebSocketNotificationEvent;
    if (payload.event === "new_notification") {
      handlers.onNewNotification?.(payload);
    }
    if (payload.event === "unread_count_updated") {
      handlers.onUnreadCountUpdated?.(payload.data.unread_count);
    }
  };
  ws.onclose = () => handlers.onClose?.();
  ws.onerror = (err) => handlers.onError?.(err);

  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, 30000);

  return () => {
    clearInterval(ping);
    ws.close();
  };
}
