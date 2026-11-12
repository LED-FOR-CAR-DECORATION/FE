import type { LucideIcon } from "lucide-react";

/** Color palettes matching Neo-Brutalism / Retro Gaming */
export type NeoRetroColor = "mint" | "yellow" | "lavender" | "coral" | "white" | "cyan";

export interface KpiCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorTheme: NeoRetroColor;
  badge?: {
    text: string;
    variant?: "success" | "warning" | "alert" | "info" | "neutral";
  };
  growth?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  helperText?: string;
  actionText?: string;
  onAction?: () => void;
}

// -------------------------------------------------------------
// MANAGER DASHBOARD TYPES (Business & Store Operations)
// -------------------------------------------------------------

export interface ManagerKpiSummary {
  totalRevenue: number;
  revenueGrowthPercent: number;
  revenuePeriod: string;
  pendingCharactersCount: number;
  lowStockModelsCount: number;
  activeBundlesCount: number;
  activePriceConfigsCount: number;
}

export interface RevenueCategoryItem {
  category: string;
  revenue: number;
  percentage: number;
  color: string;
  unitCount: number;
}

export interface TopProductItem {
  id: string;
  name: string;
  category: "HARDWARE" | "CHARACTER" | "BUNDLE";
  unitsSold: number;
  revenue: number;
  rank: number;
  thumbnail: string;
  trend: "up" | "down" | "stable";
  stockStatus?: "In stock" | "Low stock" | "Out of stock";
}

export interface PendingCharacterItem {
  id: string;
  characterId: string;
  name: string;
  designer: {
    name: string;
    avatar: string;
    handle: string;
  };
  resolution: "16x16" | "32x32" | "64x64";
  format: "GIF" | "LED_BIN" | "PNG_SPRITE";
  frames: number;
  price: number;
  isFree: boolean;
  submittedAt: string;
  thumbnailUrl: string;
  tags: string[];
  status: "Pending Review";
}

export interface LowStockLedItem {
  productId: string;
  modelCode: string;
  name: string;
  dimensions: string;
  currentStock: number;
  minimumStock: number;
  reserved: number;
  unitPrice: number;
  urgency: "CRITICAL" | "LOW" | "NORMAL";
}

export interface WarrantyAlertItem {
  ticketId: string;
  customerName: string;
  customerEmail: string;
  deviceModel: string;
  deviceSerial: string;
  issueDescription: string;
  reportedDate: string;
  status: "Under Inspection" | "Replacement Approved" | "Pending RMA" | "Resolved";
  priority: "High" | "Medium" | "Low";
}

// -------------------------------------------------------------
// ADMIN DASHBOARD TYPES (System, RBAC & Firmware)
// -------------------------------------------------------------

export interface AdminKpiSummary {
  totalUsers: number;
  totalEmployees: number;
  userGrowthPercent: number;
  activePairedDevices: number;
  devicesOnlineRate: number;
  latestFirmwareAdoptionPercent: number;
  latestFirmwareVersion: string;
  activeRolesCount: number;
  totalPermissionsCount: number;
  securityIncidents: number;
}

export interface FirmwareDistributionItem {
  version: string;
  label: string;
  deviceCount: number;
  percentage: number;
  color: string;
  releaseDate: string;
  isCurrent: boolean;
}

export interface UserRoleBreakdownItem {
  role: "CUSTOMER" | "DESIGNER" | "STAFF" | "MANAGER" | "ADMIN";
  roleNameVi: string;
  count: number;
  percentage: number;
  color: string;
  activeThisWeek: number;
}

export interface RbacActivityItem {
  id: string;
  timestamp: string;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  targetUser: {
    name: string;
    email: string;
  };
  actionType: "ROLE_CHANGE" | "PERMISSION_GRANT" | "USER_CREATED" | "ACCOUNT_SUSPENDED" | "2FA_RESET";
  actionLabel: string;
  previousRole?: string;
  newRole?: string;
  details: string;
  status: "SUCCESS" | "FLAGGED" | "PENDING_APPROVAL";
}

export interface FirmwareReleaseItem {
  id: string;
  version: string;
  buildNumber: string;
  targetModels: string[];
  binarySize: string;
  releaseDate: string;
  sha256: string;
  status: "Released" | "Draft" | "Staged" | "Deprecated";
  rolloutPercentage: number;
  downloadsCount: number;
  notes: string;
}
