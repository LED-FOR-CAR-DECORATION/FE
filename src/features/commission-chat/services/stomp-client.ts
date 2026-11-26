/**
 * STOMP 1.2 tối giản chạy trên WebSocket gốc của trình duyệt — đủ cho
 * CONNECT (Bearer token) → SUBSCRIBE /topic/commissions/{id} → nhận MESSAGE.
 * BE chặn client SEND lên /topic/**, nên client chỉ cần nhận.
 */

export type StompStatus = "connecting" | "connected" | "disconnected";

type StompFrame = { command: string; headers: Record<string, string>; body: string };

export interface StompSubscriptionOptions {
  url: string;
  destination: string;
  getToken: () => Promise<string>;
  onMessage: (body: string) => void;
  onStatusChange?: (status: StompStatus) => void;
  /** Gọi khi server trả ERROR (vd. token hết hạn / không có quyền). Trả về false để dừng kết nối lại. */
  onError?: (message: string) => Promise<boolean> | boolean;
  /**
   * Gọi mỗi lần CONNECTED thành công. `isReconnect` = false ở lần đầu (FE vừa tải lịch sử bằng REST, không cần tải lại),
   * true ở các lần kết nối lại (cần tải bù tin bị lỡ).
   */
  onConnected?: (isReconnect: boolean) => void;
  /** Gọi khi kết nối đã giữ ổn định STABLE_MS mà không có ERROR — lúc này mới coi như kết nối thành công thật. */
  onStable?: () => void;
}

const HEARTBEAT_MS = 20000;
const MAX_BACKOFF_MS = 30000;
/**
 * BE xác thực token ở CONNECT nhưng kiểm tra quyền vào phòng ở SUBSCRIBE (sau CONNECTED).
 * Nếu reset backoff ngay khi CONNECTED thì SUBSCRIBE bị từ chối sẽ tạo vòng lặp kết nối lại ~1s/lần,
 * nên chỉ reset khi kết nối đã đứng vững một khoảng.
 */
const STABLE_MS = 10000;

/** http(s)://host[:port] → ws(s)://host[:port]/ws */
export function buildStompUrl(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function serialize(command: string, headers: Record<string, string>, body = "") {
  const lines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  return `${command}\n${lines.join("\n")}\n\n${body}\0`;
}

function unescapeHeader(value: string) {
  return value.replace(/\\(.)/g, (_, char: string) => (char === "n" ? "\n" : char === "r" ? "\r" : char === "c" ? ":" : char));
}

function parse(raw: string): StompFrame | null {
  const text = raw.replace(/^[\r\n]+/, "");
  if (!text) return null; // heart-beat
  const split = text.search(/\r?\n\r?\n/);
  const head = split === -1 ? text : text.slice(0, split);
  const body = split === -1 ? "" : text.slice(split).replace(/^\r?\n\r?\n/, "");
  const [command, ...headerLines] = head.split(/\r?\n/);
  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    const index = line.indexOf(":");
    if (index > 0) {
      const key = line.slice(0, index);
      if (!(key in headers)) headers[key] = unescapeHeader(line.slice(index + 1));
    }
  }
  return { command, headers, body };
}

/** Mở kết nối, tự kết nối lại với backoff. Trả về hàm hủy. */
export function subscribeStomp(options: StompSubscriptionOptions): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let stableTimer: ReturnType<typeof setTimeout> | undefined;
  let connectedOnce = false;
  let buffer = "";

  const setStatus = (status: StompStatus) => options.onStatusChange?.(status);

  function cleanupSocket() {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
    clearTimeout(stableTimer);
    stableTimer = undefined;
    buffer = "";
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
      socket = null;
    }
  }

  function scheduleReconnect() {
    cleanupSocket();
    if (closed) return;
    setStatus("disconnected");
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt) + Math.random() * 500;
    attempt += 1;
    retryTimer = setTimeout(connect, delay);
  }

  async function handleFrame(frame: StompFrame, ws: WebSocket) {
    switch (frame.command) {
      case "CONNECTED": {
        ws.send(serialize("SUBSCRIBE", { id: "sub-0", destination: options.destination, ack: "auto" }));
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("\n");
        }, HEARTBEAT_MS);
        stableTimer = setTimeout(() => {
          attempt = 0;
          options.onStable?.();
        }, STABLE_MS);
        setStatus("connected");
        const isReconnect = connectedOnce;
        connectedOnce = true;
        options.onConnected?.(isReconnect);
        break;
      }
      case "MESSAGE":
        options.onMessage(frame.body);
        break;
      case "ERROR": {
        const message = frame.headers.message || frame.body || "STOMP error";
        const keepGoing = options.onError ? await options.onError(message) : true;
        if (keepGoing) {
          scheduleReconnect();
        } else {
          closed = true;
          cleanupSocket();
          setStatus("disconnected");
        }
        break;
      }
    }
  }

  async function connect() {
    if (closed) return;
    setStatus("connecting");
    let token = "";
    try {
      token = await options.getToken();
    } catch {
      // vẫn thử kết nối; server sẽ trả ERROR nếu thiếu token
    }
    if (closed) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(options.url);
    } catch {
      scheduleReconnect();
      return;
    }
    socket = ws;

    ws.onopen = () => {
      const host = (() => {
        try { return new URL(options.url).host; } catch { return "localhost"; }
      })();
      ws.send(serialize("CONNECT", {
        "accept-version": "1.2,1.1",
        host,
        "heart-beat": `${HEARTBEAT_MS},0`,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }));
    };
    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      buffer += event.data;
      let end = buffer.indexOf("\0");
      while (end !== -1) {
        const frame = parse(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
        if (frame) void handleFrame(frame, ws);
        end = buffer.indexOf("\0");
      }
      // phần còn lại chỉ là heart-beat (\n) thì bỏ
      if (/^[\r\n]*$/.test(buffer)) buffer = "";
    };
    ws.onclose = () => {
      if (socket === ws) scheduleReconnect();
    };
    ws.onerror = () => {
      // onclose sẽ được gọi ngay sau đó
    };
  }

  void connect();

  return () => {
    closed = true;
    clearTimeout(retryTimer);
    if (socket?.readyState === WebSocket.OPEN) {
      try { socket.send(serialize("DISCONNECT", {})); } catch { /* bỏ qua */ }
    }
    cleanupSocket();
  };
}
