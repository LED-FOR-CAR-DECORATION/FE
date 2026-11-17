const STORAGE_KEY = "mirage-commission-demo-designers";

export type DemoDesigner = { userId: string; fullName: string };

export function getDemoDesigners(): DemoDesigner[] {
  if (typeof window === "undefined") return [];
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function registerDemoDesigner(designer: DemoDesigner) {
  const designers = getDemoDesigners();
  if (designers.some((item) => item.userId === designer.userId && item.fullName === designer.fullName)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([
    designer, ...designers.filter((item) => item.userId !== designer.userId),
  ]));
}
