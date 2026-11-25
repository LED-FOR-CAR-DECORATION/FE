/**
 * Hẹn chạy `run` sau `delayMs`. Nếu lúc đó tab đang ẩn thì chờ tới khi tab hiện lại mới chạy,
 * để không gọi API khi không ai nhìn màn hình. Trả về hàm huỷ.
 */
export function scheduleVisiblePoll(run: () => void, delayMs: number): () => void {
  let onVisible: (() => void) | undefined;
  const fire = () => {
    if (typeof document === "undefined" || !document.hidden) {
      run();
      return;
    }
    onVisible = () => {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", onVisible!);
      onVisible = undefined;
      run();
    };
    document.addEventListener("visibilitychange", onVisible);
  };
  const timer = setTimeout(fire, delayMs);
  return () => {
    clearTimeout(timer);
    if (onVisible) document.removeEventListener("visibilitychange", onVisible);
  };
}

/** true khi tab đang hiển thị (luôn true phía server). */
export function isPageVisible(): boolean {
  return typeof document === "undefined" || !document.hidden;
}
