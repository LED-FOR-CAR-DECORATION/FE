/**
 * Giới hạn số request chạy song song cho một nhóm query (vd. chi tiết đơn khi useQueries mở nhiều query cùng lúc).
 * `const run = createLimiter(6); queryFn: () => run(() => fetchX(id))`
 */
export function createLimiter(maxConcurrent: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  const next = () => {
    if (active >= maxConcurrent) return;
    const start = waiting.shift();
    if (start) start();
  };

  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      waiting.push(() => {
        active += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      });
      next();
    });
  };
}
