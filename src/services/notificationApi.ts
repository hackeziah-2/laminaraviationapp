import type {
  Notification,
  NotificationListStatus,
  NotificationMetadata,
  NotificationMutationResponse,
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

function withRecipientAccount(token: string, path: string) {
  const recipientAccount = getRecipientAccountFromToken(token);
  if (!recipientAccount) return `${API_BASE}${path}`;
  const separator = path.includes("?") ? "&" : "?";
  return `${API_BASE}${path}${separator}recipient_account=${recipientAccount}`;
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
  if (!res.ok) throw new Error(await readErrorDetail(res, message));
  return (await res.json()) as T;
}

async function readErrorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
    if (Array.isArray(body.detail)) {
      const parts = body.detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length) return parts.join(" ");
    }
  } catch {
    return fallback;
  }
  return fallback;
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
  const query = new URLSearchParams({
    status,
    page: String(page),
    limit: String(limit),
  });
  const url = withRecipientAccount(token, `/notifications?${query.toString()}`);
  const res = await fetch(url, { headers: authHeaders(token), cache: "no-store" });
  return handleJsonResponse<NotificationPagedResponse>(
    res,
    "Failed to fetch notifications"
  );
}

export async function fetchUnreadCount(token: string) {
  const url = withRecipientAccount(token, "/notifications/unread-count");
  const res = await fetch(url, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleJsonResponse<UnreadCountResponse>(
    res,
    "Failed to fetch unread count"
  );
}

export async function markNotificationRead(token: string, id: number) {
  const res = await fetch(withRecipientAccount(token, `/notifications/${id}/read`), {
    method: "PATCH",
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleJsonResponse<Notification & NotificationMutationResponse>(
    res,
    "Failed to mark notification as read"
  );
}

export async function markNotificationUnread(token: string, id: number) {
  const res = await fetch(withRecipientAccount(token, `/notifications/${id}/unread`), {
    method: "PATCH",
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleJsonResponse<Notification & NotificationMutationResponse>(
    res,
    "Failed to mark notification as unread"
  );
}

export async function markAllNotificationsRead(token: string) {
  const res = await fetch(withRecipientAccount(token, "/notifications/read-all"), {
    method: "PATCH",
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleJsonResponse<NotificationMutationResponse>(
    res,
    "Failed to mark all as read"
  );
}

export async function clearAllNotifications(token: string) {
  const res = await fetch(withRecipientAccount(token, "/notifications/clear-all"), {
    method: "PATCH",
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleJsonResponse<NotificationMutationResponse>(
    res,
    "Failed to delete notifications"
  );
}

export async function deleteNotification(token: string, id: number) {
  const res = await fetch(withRecipientAccount(token, `/notifications/${id}`), {
    method: "DELETE",
    headers: authHeaders(token),
    cache: "no-store",
  });
  return handleJsonResponse<NotificationMutationResponse>(
    res,
    "Failed to delete notification"
  );
}

export async function archiveNotification(token: string, id: number) {
  const res = await fetch(withRecipientAccount(token, `/notifications/${id}/archive`), {
    method: "PATCH",
    headers: authHeaders(token),
    cache: "no-store",
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
    onUnreadCountUpdated?: (counts: {
      unread_count: number;
      total?: number;
      read_count?: number;
    }) => void;
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
      handlers.onUnreadCountUpdated?.(payload.data);
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
