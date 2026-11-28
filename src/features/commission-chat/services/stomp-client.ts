/**
 * Các hàm giao thức STOMP 1.2 tối giản (dựng URL, ghi/đọc frame) chạy trên WebSocket gốc của trình duyệt.
 * Việc quản lý kết nối (một socket dùng chung, đăng ký nhiều topic, kết nối lại) nằm ở stomp-hub.ts.
 */

export type StompStatus = "connecting" | "connected" | "disconnected";

export type StompFrame = { command: string; headers: Record<string, string>; body: string };

/** http(s)://host[:port] → ws(s)://host[:port]/ws */
export function buildStompUrl(apiBaseUrl: string) {
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function serializeFrame(command: string, headers: Record<string, string>, body = "") {
  const lines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  return `${command}\n${lines.join("\n")}\n\n${body}\0`;
}

function unescapeHeader(value: string) {
  return value.replace(/\\(.)/g, (_, char: string) => (char === "n" ? "\n" : char === "r" ? "\r" : char === "c" ? ":" : char));
}

/** Trả về null với frame rỗng (heart-beat). */
export function parseFrame(raw: string): StompFrame | null {
  const text = raw.replace(/^[\r\n]+/, "");
  if (!text) return null;
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
