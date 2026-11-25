export interface PageResult<T> {
  items: T[];
  totalPages: number;
}

/** Tải trang đầu, rồi tải song song các trang còn lại theo `totalPages` mà backend trả về. */
export async function fetchAllPages<T>(
  loadPage: (page: number) => Promise<PageResult<T>>,
  maxPages = 50,
): Promise<T[]> {
  const first = await loadPage(0);
  const pageCount = Math.min(Math.max(first.totalPages, 1), maxPages);
  if (pageCount <= 1) return first.items;
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => loadPage(index + 1)),
  );
  return first.items.concat(...rest.map((page) => page.items));
}

/** Như Promise.all nhưng chỉ chạy tối đa `limit` tác vụ cùng lúc, giữ nguyên thứ tự kết quả. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
