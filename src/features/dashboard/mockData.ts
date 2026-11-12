import type {
  AdminKpiSummary,
  FirmwareDistributionItem,
  FirmwareReleaseItem,
  LowStockLedItem,
  ManagerKpiSummary,
  PendingCharacterItem,
  RbacActivityItem,
  RevenueCategoryItem,
  TopProductItem,
  UserRoleBreakdownItem,
  WarrantyAlertItem,
} from "./types";

export const MANAGER_KPI_MOCK: ManagerKpiSummary = {
  totalRevenue: 0,
  revenueGrowthPercent: 0,
  revenuePeriod: "vs. tháng trước",
  pendingCharactersCount: 0,
  lowStockModelsCount: 0,
  activeBundlesCount: 0,
  activePriceConfigsCount: 0,
};

export const REVENUE_BY_CATEGORY_MOCK: RevenueCategoryItem[] = [];
export const TOP_SELLING_PRODUCTS_MOCK: TopProductItem[] = [];
export const PENDING_CHARACTERS_QUEUE_MOCK: PendingCharacterItem[] = [];
export const LOW_STOCK_LEDS_MOCK: LowStockLedItem[] = [];
export const WARRANTY_ALERTS_MOCK: WarrantyAlertItem[] = [];

export const ADMIN_KPI_MOCK: AdminKpiSummary = {
  totalUsers: 0,
  totalEmployees: 0,
  userGrowthPercent: 0,
  activePairedDevices: 0,
  devicesOnlineRate: 0,
  latestFirmwareAdoptionPercent: 0,
  latestFirmwareVersion: "—",
  activeRolesCount: 0,
  totalPermissionsCount: 0,
  securityIncidents: 0,
};

export const FIRMWARE_DISTRIBUTION_MOCK: FirmwareDistributionItem[] = [];
export const USER_ROLE_BREAKDOWN_MOCK: UserRoleBreakdownItem[] = [];
export const RBAC_ACTIVITIES_MOCK: RbacActivityItem[] = [];
export const FIRMWARE_RELEASES_MOCK: FirmwareReleaseItem[] = [];
