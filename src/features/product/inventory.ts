export type InventoryStatus = "In stock" | "Low stock" | "Out of stock";

export interface LedInventoryItem {
  productId: string;
  modelCode: string;
  name: string;
  description: string;
  previewUrl?: string;
  stock: number;
  reserved: number;
  minimumStock: number;
  unitPrice: number;
  lastUpdated: string;
}

export interface InventoryImportRecord {
  id: string;
  fileName: string;
  importedAt: string;
  itemCount: number;
  status: "Completed" | "Failed";
}

export const LED_INVENTORY: LedInventoryItem[] = [
  {
    productId: "matrix-16",
    modelCode: "LED-16",
    name: "16 × 16 Matrix Panel",
    description: "Bảng LED ma trận 16×16",
    stock: 120,
    reserved: 8,
    minimumStock: 20,
    unitPrice: 15,
    lastUpdated: "2026-10-19T09:30:00.000Z",
  },
  {
    productId: "matrix-32",
    modelCode: "LED-32",
    name: "32 × 32 Matrix Panel",
    description: "Bảng LED ma trận 32×32",
    previewUrl: "/images/products/led/matrix-32.png",
    stock: 85,
    reserved: 12,
    minimumStock: 20,
    unitPrice: 20,
    lastUpdated: "2026-10-19T08:45:00.000Z",
  },
  {
    productId: "matrix-64",
    modelCode: "LED-64",
    name: "64 × 64 Matrix Panel",
    description: "Bảng LED ma trận 64×64",
    previewUrl: "/images/products/led/matrix-64.png",
    stock: 15,
    reserved: 5,
    minimumStock: 10,
    unitPrice: 120,
    lastUpdated: "2026-10-18T15:10:00.000Z",
  },
  {
    productId: "controller-box",
    modelCode: "LED-CTRL",
    name: "LED Controller Box",
    description: "Hộp điều khiển LED",
    stock: 46,
    reserved: 0,
    minimumStock: 15,
    unitPrice: 12.5,
    lastUpdated: "2026-10-17T11:20:00.000Z",
  },
];

export const INVENTORY_IMPORTS: InventoryImportRecord[] = [
  { id: "IMPORT-001", fileName: "LED_Models_20261019.xlsx", importedAt: "2026-10-19T14:30:00.000Z", itemCount: 20, status: "Completed" },
  { id: "IMPORT-002", fileName: "LED_Models_20261015.xlsx", importedAt: "2026-10-15T10:12:00.000Z", itemCount: 20, status: "Completed" },
  { id: "IMPORT-003", fileName: "LED_Retro_20261012.xlsx", importedAt: "2026-10-12T09:45:00.000Z", itemCount: 50, status: "Failed" },
];

export function getAvailableStock(item: LedInventoryItem) {
  return Math.max(0, item.stock - item.reserved);
}

export function getInventoryStatus(item: LedInventoryItem): InventoryStatus {
  const available = getAvailableStock(item);
  if (available === 0) return "Out of stock";
  if (available <= item.minimumStock) return "Low stock";
  return "In stock";
}
