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
    productId: "1",
    modelCode: "LUM-MAT-6464",
    name: "Lumintra Matrix Pro 64×64 RGB",
    description: "Bảng LED ma trận 64x64 bóng RGB độ sáng cao, tần số quét 120Hz.",
    previewUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
    stock: 50,
    reserved: 0,
    minimumStock: 10,
    unitPrice: 1490000,
    lastUpdated: "2026-11-10T10:00:00Z",
  },
  {
    productId: "2",
    modelCode: "LUM-CUBE-3232",
    name: "Lumintra DeskCube Mini 32×32",
    description: "Khung LED để bàn nhỏ gọn 32x32 pixel, vỏ mica mờ nguyên khối.",
    previewUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    stock: 35,
    reserved: 1,
    minimumStock: 5,
    unitPrice: 890000,
    lastUpdated: "2026-11-11T14:30:00Z",
  },
  {
    productId: "3",
    modelCode: "LUM-WALL-6432",
    name: "Lumintra WallStudio Panorama 64×32",
    description: "Màn hình LED treo tường khổ rộng 64x32 pixel, tích hợp đồng hồ và thời tiết.",
    previewUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
    stock: 20,
    reserved: 0,
    minimumStock: 5,
    unitPrice: 2650000,
    lastUpdated: "2026-11-10T08:00:00Z",
  },
];

export const INVENTORY_IMPORTS: InventoryImportRecord[] = [];

export function getAvailableStock(item: LedInventoryItem) {
  return Math.max(0, item.stock - item.reserved);
}

export function getInventoryStatus(item: LedInventoryItem): InventoryStatus {
  const available = getAvailableStock(item);
  if (available === 0) return "Out of stock";
  if (available <= item.minimumStock) return "Low stock";
  return "In stock";
}
