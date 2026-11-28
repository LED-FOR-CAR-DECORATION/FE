/**
 * Một kết nối STOMP dùng chung cho cả tab.
 *
 * - Nhiều nơi (phòng chat, hộp thư) cùng đăng ký topic qua `subscribeTopic`; cùng một topic chỉ SUBSCRIBE một lần.
 * - Đổi phòng chỉ là UNSUBSCRIBE/SUBSCRIBE trên socket sẵn có. Khi không còn ai dùng (rời chat) hoặc đóng tab
 *   (`pagehide`), hub gửi DISCONNECT và đóng socket ngay (`IDLE_CLOSE_MS = 0`, qua macrotask để chịu được StrictMode).
 * - BE kiểm quyền ở SUBSCRIBE và trả ERROR rồi đóng CẢ kết nối khi một topic bị từ chối. Hub tìm ra topic bị từ chối
 *   (topic vừa SUBSCRIBE trong DENY_WINDOW_MS), báo `onDenied` cho topic đó, bỏ qua nó và kết nối lại cho các topic còn lại.
 *   Nếu nhiều topic cùng vừa SUBSCRIBE thì lần sau SUBSCRIBE lần lượt từng topic để xác định đúng topic bị từ chối.
 * - Heart-beat: chỉ kiểm tra kết nối "chết lặng" khi server đồng ý gửi heart-beat (giá trị trong CONNECTED khác 0).
 * - Khi tab bị ẩn quá HIDDEN_CLOSE_MS (2 phút), hub ngắt kết nối để không giữ socket nền; khi tab hiện lại sẽ
 *   kết nối lại và gọi `onActive(true)` để các nơi đăng ký tự tải bù tin bị lỡ.
 */
import { getApiBaseUrl, refreshAccessToken } from "@/lib/api/client";
import { AUTH_CHANGED_EVENT, getSessionToken, SESSION_EXPIRED_EVENT } from "@/lib/auth/session";
import { buildStompUrl, parseFrame, serializeFrame, type StompFrame, type StompStatus } from "./stomp-client";

export type { StompStatus } from "./stomp-client";

export interface TopicHandlers {
  onMessage: (body: string) => void;
  /**
   * Gọi khi topic đã được SUBSCRIBE trên kết nối hiện tại. `isReconnect` = false ở lần đầu với handler này
   * (nơi đăng ký vừa tải dữ liệu bằng REST, không cần tải lại), true ở các lần kết nối lại (cần tải bù tin bị lỡ).
   */
  onActive?: (isReconnect: boolean) => void;
  /** Server từ chối quyền vào topic. Hub không thử lại topic này nữa; nơi đăng ký nên chuyển sang poll dự phòng. */
  onDenied?: (message: string) => void;
}

const CLIENT_HEARTBEAT_MS = 20_000;
const WANT_SERVER_HEARTBEAT_MS = 20_000;
const LIVENESS_CHECK_MS = 5_000;
const STABLE_MS = 10_000;
const IDLE_CLOSE_MS = 0;
const HIDDEN_CLOSE_MS = 2 * 60_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_ERRORS = 3;
const DENY_WINDOW_MS = 2_000;
const DENIED_CACHE_MS = 60_000;
/** Sau khi dừng vì lỗi liên tiếp, tự thử lại sau khoảng này (thay vì mất realtime tới khi rời trang). */
const RECOVER_AFTER_STOP_MS = 60_000;
const ACCESS_DENIED = /AccessDenied|not authorized|do not own|Unsupported subscription|chat room not found/i;

interface Entry {
  destination: string;
  id: string;
  listeners: Set<TopicHandlers>;
  /** Đã SUBSCRIBE trên socket hiện tại. */
  subscribed: boolean;
  subscribedAt: number;
  /** Đã từng giữ được quá DENY_WINDOW_MS mà không bị từ chối. */
  confirmed: boolean;
}

const entries = new Map<string, Entry>();
const deniedCache = new Map<string, { message: string; at: number }>();
const statusListeners = new Set<(status: StompStatus) => void>();
/** Handler đã từng được kích hoạt (để phân biệt lần đầu và kết nối lại). */
let activatedHandlers = new WeakSet<TopicHandlers>();

let nextSubId = 1;
let status: StompStatus = "disconnected";
let socket: WebSocket | null = null;
let connecting = false;
let connected = false;
let stopped = false;
/** Trình duyệt báo mất mạng: không thử kết nối cho tới khi có sự kiện `online`. */
let offline = false;
/** Đã đăng xuất: không kết nối cho tới khi đăng nhập lại. */
let loggedOut = false;
let recoverTimer: ReturnType<typeof setTimeout> | undefined;
let attempt = 0;
let errors = 0;
let sequential = false;
let buffer = "";
let lastFrameAt = 0;
let recentSubscribes: { destination: string; at: number }[] = [];
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
let hiddenSince = 0;
let hiddenPaused = false;
let lifecycleBound = false;
let stableTimer: ReturnType<typeof setTimeout> | undefined;
let sequentialTimer: ReturnType<typeof setTimeout> | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
let livenessTimer: ReturnType<typeof setInterval> | undefined;

function setStatus(next: StompStatus) {
  if (status === next) return;
  status = next;
  for (const listener of statusListeners) listener(next);
}

/** Topic đang có nơi dùng và chưa bị từ chối — chỉ những topic này mới cần giữ socket. */
function activeEntries() {
  return [...entries.values()].filter((entry) => entry.listeners.size > 0 && !getDenied(entry.destination));
}

function getDenied(destination: string) {
  const cached = deniedCache.get(destination);
  if (!cached) return undefined;
  if (Date.now() - cached.at > DENIED_CACHE_MS) {
    deniedCache.delete(destination);
    return undefined;
  }
  return cached.message;
}

function send(frame: string) {
  if (socket && connected && socket.readyState === WebSocket.OPEN) socket.send(frame);
}

function markConfirmed() {
  const now = Date.now();
  for (const entry of entries.values()) {
    if (entry.subscribed && now - entry.subscribedAt > DENY_WINDOW_MS) entry.confirmed = true;
  }
}

function activateHandler(handler: TopicHandlers) {
  const isReconnect = activatedHandlers.has(handler);
  activatedHandlers.add(handler);
  try {
    handler.onActive?.(isReconnect);
  } catch {
    // lỗi của nơi đăng ký không được làm hỏng hub
  }
}

function sendSubscribe(entry: Entry) {
  if (entry.subscribed || entry.listeners.size === 0 || getDenied(entry.destination)) return;
  send(serializeFrame("SUBSCRIBE", { id: entry.id, destination: entry.destination, ack: "auto" }));
  entry.subscribed = true;
  entry.subscribedAt = Date.now();
  recentSubscribes.push({ destination: entry.destination, at: entry.subscribedAt });
  for (const handler of entry.listeners) activateHandler(handler);
}

function subscribeAll() {
  markConfirmed();
  const pending = activeEntries().filter((entry) => !getDenied(entry.destination));
  const confirmedFirst = pending.filter((entry) => entry.confirmed);
  const unconfirmed = pending.filter((entry) => !entry.confirmed);
  confirmedFirst.forEach(sendSubscribe);
  if (!sequential) {
    unconfirmed.forEach(sendSubscribe);
    return;
  }
  // Chế độ lần lượt: mỗi topic chưa xác nhận được SUBSCRIBE cách nhau DENY_WINDOW_MS để biết chính xác topic nào bị từ chối.
  const queue = [...unconfirmed];
  const ws = socket;
  const next = () => {
    if (socket !== ws || !connected) return;
    const entry = queue.shift();
    if (!entry) {
      sequential = false;
      return;
    }
    sendSubscribe(entry);
    sequentialTimer = setTimeout(next, DENY_WINDOW_MS);
  };
  next();
}

function cleanupSocket() {
  clearInterval(heartbeatTimer);
  clearInterval(livenessTimer);
  clearTimeout(stableTimer);
  clearTimeout(sequentialTimer);
  heartbeatTimer = livenessTimer = stableTimer = sequentialTimer = undefined;
  buffer = "";
  connected = false;
  recentSubscribes = [];
  for (const entry of entries.values()) entry.subscribed = false;
  if (socket) {
    const ws = socket;
    socket = null;
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
    if (ws.readyState === WebSocket.OPEN) ws.close(1000);
    else if (ws.readyState === WebSocket.CONNECTING) ws.close();
  }
}

function disconnectSocket(resetStopped = false) {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  send(serializeFrame("DISCONNECT", {}));
  cleanupSocket();
  setStatus("disconnected");
  if (resetStopped) stopped = false;
  attempt = 0;
  errors = 0;
  sequential = false;
}

function clearHiddenState() {
  clearTimeout(hiddenTimer);
  hiddenTimer = undefined;
  hiddenSince = 0;
}

function pauseWhenHidden() {
  clearTimeout(hiddenTimer);
  hiddenTimer = undefined;
  if (typeof document === "undefined" || !document.hidden || activeEntries().length === 0) return;
  hiddenPaused = true;
  clearTimeout(idleTimer);
  idleTimer = undefined;
  disconnectSocket();
}

function syncHiddenTimer() {
  if (typeof document === "undefined") return;
  if (!document.hidden) {
    clearHiddenState();
    return;
  }
  if (!hiddenSince) hiddenSince = Date.now();
  if (hiddenPaused || hiddenTimer) return;
  if (socket || connecting || retryTimer) {
    hiddenTimer = setTimeout(pauseWhenHidden, HIDDEN_CLOSE_MS);
  }
}

function handleVisibilityChange() {
  if (typeof document === "undefined") return;
  if (document.hidden) {
    syncHiddenTimer();
    return;
  }
  const hiddenDuration = hiddenSince ? Date.now() - hiddenSince : 0;
  clearHiddenState();
  if (hiddenPaused) {
    hiddenPaused = false;
    attempt = 0;
    errors = 0;
    sequential = false;
    if (!stopped && activeEntries().length > 0) void connect();
    return;
  }
  if (activeEntries().length === 0) return;
  if (stopped) {
    // Đã dừng vì lỗi: người dùng quay lại tab là lúc hợp lý để thử lại.
    resume();
    return;
  }
  // Nếu máy ngủ làm timer bị trễ và tab đã ẩn >= HIDDEN_CLOSE_MS, đóng socket cũ để kết nối lại và tải bù.
  if (hiddenDuration >= HIDDEN_CLOSE_MS && (socket || connecting || retryTimer)) {
    disconnectSocket();
    void connect();
    return;
  }
  // Tab hiện lại trong khi đang chờ backoff: thử kết nối lại ngay.
  if (!socket && !connecting && retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = undefined;
    void connect();
  }
}

function handlePageHide() {
  clearTimeout(idleTimer);
  idleTimer = undefined;
  clearHiddenState();
  hiddenPaused = false;
  disconnectSocket(true);
}

function handlePageShow(event: PageTransitionEvent) {
  if (!event.persisted || activeEntries().length === 0 || stopped) return;
  clearHiddenState();
  hiddenPaused = false;
  void connect();
}

function ensureLifecycleListeners() {
  if (lifecycleBound || typeof document === "undefined") return;
  lifecycleBound = true;
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("pageshow", handlePageShow);
  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);
  window.addEventListener(SESSION_EXPIRED_EVENT, () => resetForAuthChange(false));
  window.addEventListener(AUTH_CHANGED_EVENT, (event) => {
    resetForAuthChange(Boolean((event as CustomEvent<{ loggedIn?: boolean }>).detail?.loggedIn));
  });
  offline = typeof navigator !== "undefined" && navigator.onLine === false;
}

function scheduleReconnect() {
  cleanupSocket();
  if (stopped || offline || loggedOut || hiddenPaused || activeEntries().length === 0) {
    setStatus("disconnected");
    return;
  }
  setStatus("disconnected");
  const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt) + Math.random() * 500;
  attempt += 1;
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void connect();
  }, delay);
  syncHiddenTimer();
}

/** Kết nối lại ngay (không tăng backoff) — dùng sau khi đã loại topic bị từ chối. */
function reconnectSoon() {
  cleanupSocket();
  setStatus("disconnected");
  if (stopped || hiddenPaused || activeEntries().length === 0) return;
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void connect();
  }, 300);
  syncHiddenTimer();
}

function stop() {
  stopped = true;
  clearTimeout(retryTimer);
  retryTimer = undefined;
  clearHiddenState();
  hiddenPaused = false;
  cleanupSocket();
  setStatus("disconnected");
  clearTimeout(recoverTimer);
  if (!loggedOut) recoverTimer = setTimeout(() => resume(), RECOVER_AFTER_STOP_MS);
}

/** Bỏ trạng thái dừng/backoff và kết nối lại ngay nếu còn topic cần giữ. */
function resume() {
  clearTimeout(recoverTimer);
  recoverTimer = undefined;
  if (loggedOut || offline) return;
  stopped = false;
  attempt = 0;
  errors = 0;
  sequential = false;
  clearTimeout(retryTimer);
  retryTimer = undefined;
  if (activeEntries().length > 0) void connect();
}

function handleOffline() {
  offline = true;
  clearTimeout(retryTimer);
  retryTimer = undefined;
  cleanupSocket();
  setStatus("disconnected");
}

function handleOnline() {
  offline = false;
  // Mạng vừa có lại: kết nối ngay, không chờ hết backoff (tối đa 30s).
  if (!socket && !connecting) resume();
}

/** Đăng xuất/đổi tài khoản/hết phiên: đóng socket mang token cũ và quên mọi trạng thái của người dùng trước. */
function resetForAuthChange(loggedIn: boolean) {
  clearTimeout(recoverTimer);
  recoverTimer = undefined;
  disconnectSocket(true);
  deniedCache.clear();
  activatedHandlers = new WeakSet();
  for (const entry of entries.values()) entry.confirmed = false;
  loggedOut = !loggedIn;
  if (loggedIn && activeEntries().length > 0) void connect();
}

function deny(entry: Entry, message: string) {
  deniedCache.set(entry.destination, { message, at: Date.now() });
  for (const handler of entry.listeners) {
    try {
      handler.onDenied?.(message);
    } catch {
      // bỏ qua
    }
  }
}

async function handleError(frame: StompFrame) {
  const message = frame.headers.message || frame.body || "STOMP error";
  if (ACCESS_DENIED.test(message)) {
    markConfirmed();
    const now = Date.now();
    const candidates = [...new Set(recentSubscribes.filter((item) => now - item.at <= DENY_WINDOW_MS).map((item) => item.destination))]
      .map((destination) => entries.get(destination))
      .filter((entry): entry is Entry => Boolean(entry && !entry.confirmed && !getDenied(entry.destination)));
    if (candidates.length === 1) {
      deny(candidates[0], message);
      reconnectSoon();
      return;
    }
    if (candidates.length > 1) {
      sequential = true;
      reconnectSoon();
      return;
    }
    // Topic đã xác nhận nay bị từ chối (vd. tài khoản bị khóa) → refresh token cũng vô ích.
    stop();
    return;
  }
  errors += 1;
  if (errors >= MAX_ERRORS) {
    stop();
    return;
  }
  try {
    if (!(await refreshAccessToken())) {
      stop();
      return;
    }
  } catch {
    // lỗi tạm thời khi refresh → vẫn thử lại theo backoff
  }
  scheduleReconnect();
}

function handleConnected(frame: StompFrame, ws: WebSocket) {
  connected = true;
  lastFrameAt = Date.now();
  heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send("\n");
  }, CLIENT_HEARTBEAT_MS);
  const [serverSends] = (frame.headers["heart-beat"] ?? "0,0").split(",").map((value) => Number(value) || 0);
  if (serverSends > 0) {
    const expected = Math.max(serverSends, WANT_SERVER_HEARTBEAT_MS);
    livenessTimer = setInterval(() => {
      if (Date.now() - lastFrameAt > expected * 2 + LIVENESS_CHECK_MS) scheduleReconnect();
    }, LIVENESS_CHECK_MS);
  }
  stableTimer = setTimeout(() => {
    attempt = 0;
    errors = 0;
  }, STABLE_MS);
  setStatus("connected");
  subscribeAll();
}

function handleMessage(frame: StompFrame) {
  const entry = entries.get(frame.headers.destination ?? "")
    ?? [...entries.values()].find((item) => item.id === frame.headers.subscription);
  if (!entry) return;
  for (const handler of entry.listeners) {
    try {
      handler.onMessage(frame.body);
    } catch {
      // bỏ qua lỗi của nơi đăng ký
    }
  }
}

async function connect() {
  if (socket || connecting || stopped || offline || loggedOut || hiddenPaused || activeEntries().length === 0) return;
  connecting = true;
  clearTimeout(retryTimer);
  retryTimer = undefined;
  setStatus("connecting");
  syncHiddenTimer();
  let url: string;
  try {
    url = buildStompUrl(getApiBaseUrl());
  } catch {
    connecting = false;
    stop();
    return;
  }
  let token = "";
  try {
    token = await getSessionToken();
  } catch {
    // vẫn thử kết nối; server sẽ trả ERROR nếu thiếu token
  }
  connecting = false;
  if (socket || stopped || offline || loggedOut || hiddenPaused || activeEntries().length === 0) {
    if (!socket) setStatus("disconnected");
    return;
  }

  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }
  socket = ws;
  syncHiddenTimer();
  ws.onopen = () => {
    const host = (() => {
      try { return new URL(url).host; } catch { return "localhost"; }
    })();
    ws.send(serializeFrame("CONNECT", {
      "accept-version": "1.2,1.1",
      host,
      "heart-beat": `${CLIENT_HEARTBEAT_MS},${WANT_SERVER_HEARTBEAT_MS}`,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }));
  };
  ws.onmessage = (event) => {
    if (socket !== ws || typeof event.data !== "string") return;
    lastFrameAt = Date.now();
    buffer += event.data;
    let end = buffer.indexOf("\0");
    while (end !== -1) {
      const frame = parseFrame(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (frame) {
        if (frame.command === "CONNECTED") handleConnected(frame, ws);
        else if (frame.command === "MESSAGE") handleMessage(frame);
        else if (frame.command === "ERROR") {
          // Server sẽ đóng socket ngay sau ERROR; handleError tự quyết định kết nối lại hay dừng,
          // nên tách onclose ra để không kích hoạt thêm một lần kết nối lại song song.
          ws.onclose = null;
          void handleError(frame);
          return;
        }
      }
      end = buffer.indexOf("\0");
    }
    if (/^[\r\n]*$/.test(buffer)) buffer = "";
  };
  ws.onclose = () => {
    if (socket === ws) scheduleReconnect();
  };
  ws.onerror = () => {
    // onclose sẽ được gọi ngay sau đó
  };
}

function closeWhenIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    idleTimer = undefined;
    if (activeEntries().length > 0) return;
    clearHiddenState();
    hiddenPaused = false;
    disconnectSocket(true);
  }, IDLE_CLOSE_MS);
}

/** Đăng ký nhận tin của một topic trên kết nối dùng chung. Trả về hàm hủy đăng ký. */
export function subscribeTopic(destination: string, handler: TopicHandlers): () => void {
  if (typeof window === "undefined") return () => {};
  ensureLifecycleListeners();
  clearTimeout(idleTimer);
  idleTimer = undefined;
  if (typeof document !== "undefined" && !document.hidden && hiddenPaused) {
    hiddenPaused = false;
    clearHiddenState();
  }
  let entry = entries.get(destination);
  if (!entry) {
    entry = { destination, id: `sub-${nextSubId++}`, listeners: new Set(), subscribed: false, subscribedAt: 0, confirmed: false };
    entries.set(destination, entry);
  }
  entry.listeners.add(handler);

  const denied = getDenied(destination);
  if (denied) {
    queueMicrotask(() => handler.onDenied?.(denied));
  } else if (connected && socket) {
    if (entry.subscribed) activateHandler(handler);
    else sendSubscribe(entry);
  } else if (!hiddenPaused) {
    if (stopped && !loggedOut) resume();
    else void connect();
  }
  syncHiddenTimer();

  const current = entry;
  return () => {
    current.listeners.delete(handler);
    if (current.listeners.size === 0) {
      if (current.subscribed) send(serializeFrame("UNSUBSCRIBE", { id: current.id }));
      if (entries.get(destination) === current) entries.delete(destination);
    }
    if (activeEntries().length === 0) closeWhenIdle();
  };
}

/** Theo dõi trạng thái kết nối chung. Gọi ngay với trạng thái hiện tại; trả về hàm hủy. */
export function subscribeHubStatus(listener: (status: StompStatus) => void): () => void {
  statusListeners.add(listener);
  listener(status);
  return () => {
    statusListeners.delete(listener);
  };
}

/**
 * Đóng socket hiện tại và kết nối lại ngay (các nơi đăng ký nhận `onActive(true)` để tải bù).
 * Dùng khi phát hiện kết nối "chết lặng": REST có tin mới mà socket không nhận được.
 */
export function reconnectNow(): void {
  if (typeof window === "undefined" || loggedOut) return;
  disconnectSocket(true);
  resume();
}
