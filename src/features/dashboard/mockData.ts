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

// =========================================================================
// MANAGER DASHBOARD MOCK DATA
// =========================================================================

export const MANAGER_KPI_MOCK: ManagerKpiSummary = {
  totalRevenue: 1845200000, // 1.845 Billion VND
  revenueGrowthPercent: 18.4,
  revenuePeriod: "vs. tháng trước",
  pendingCharactersCount: 14,
  lowStockModelsCount: 3,
  activeBundlesCount: 8,
  activePriceConfigsCount: 24,
};

export const REVENUE_BY_CATEGORY_MOCK: RevenueCategoryItem[] = [
  {
    category: "LED Hardware",
    revenue: 1144000000,
    percentage: 62,
    color: "#a7f3d0", // Pastel Mint
    unitCount: 842,
  },
  {
    category: "Pixel Characters",
    revenue: 424400000,
    percentage: 23,
    color: "#fef08a", // Pastel Yellow
    unitCount: 3410,
  },
  {
    category: "Custom Commissions",
    revenue: 184500000,
    percentage: 10,
    color: "#e9d5ff", // Lavender
    unitCount: 128,
  },
  {
    category: "Bundles & Accessories",
    revenue: 92300000,
    percentage: 5,
    color: "#fed7aa", // Pastel Coral
    unitCount: 195,
  },
];

export const TOP_SELLING_PRODUCTS_MOCK: TopProductItem[] = [
  {
    id: "matrix-64",
    name: "64 × 64 Matrix Pro Windshield",
    category: "HARDWARE",
    unitsSold: 342,
    revenue: 646380000,
    rank: 1,
    thumbnail: "🖥️",
    trend: "up",
    stockStatus: "In stock",
  },
  {
    id: "char-cyber-samurai",
    name: "Cyber Samurai [Animated 60fps]",
    category: "CHARACTER",
    unitsSold: 1290,
    revenue: 114810000,
    rank: 2,
    thumbnail: "⚔️",
    trend: "up",
    stockStatus: "In stock",
  },
  {
    id: "matrix-32",
    name: "32 × 32 Matrix Panel Compact",
    category: "HARDWARE",
    unitsSold: 284,
    revenue: 198516000,
    rank: 3,
    thumbnail: "🔲",
    trend: "stable",
    stockStatus: "In stock",
  },
  {
    id: "char-neon-cat",
    name: "Neon Neko Wave (32×32)",
    category: "CHARACTER",
    unitsSold: 980,
    revenue: 87220000,
    rank: 4,
    thumbnail: "🐱",
    trend: "up",
    stockStatus: "In stock",
  },
  {
    id: "bundle-driver-duo",
    name: "Combo Drift King (64×64 + 3 Chars)",
    category: "BUNDLE",
    unitsSold: 145,
    revenue: 288550000,
    rank: 5,
    thumbnail: "🏎️",
    trend: "down",
    stockStatus: "Low stock",
  },
];

export const PENDING_CHARACTERS_QUEUE_MOCK: PendingCharacterItem[] = [
  {
    id: "queue-1",
    characterId: "c-neon-cyber-valkyrie",
    name: "Neon Valkyrie Overdrive",
    designer: {
      name: "Minh Quân Pixels",
      avatar: "👨‍🎨",
      handle: "@quan_pixelart",
    },
    resolution: "64x64",
    format: "LED_BIN",
    frames: 120,
    price: 129000,
    isFree: false,
    submittedAt: "2026-10-30T07:15:00Z",
    thumbnailUrl: "👾",
    tags: ["Mecha", "Sci-Fi", "Glow", "Animated"],
    status: "Pending Review",
  },
  {
    id: "queue-2",
    characterId: "c-retro-8bit-skull",
    name: "8-Bit Flaming Skull Fire",
    designer: {
      name: "Hoàng Linh (Linx)",
      avatar: "👩‍🎨",
      handle: "@linx_retro",
    },
    resolution: "32x32",
    format: "GIF",
    frames: 45,
    price: 69000,
    isFree: false,
    submittedAt: "2026-10-30T06:40:00Z",
    thumbnailUrl: "💀",
    tags: ["Retro", "Fire", "Gaming"],
    status: "Pending Review",
  },
  {
    id: "queue-3",
    characterId: "c-pixel-drift-car",
    name: "AE86 Trueno Drift Pixel",
    designer: {
      name: "DriftWorks Studio",
      avatar: "🏎️",
      handle: "@driftworks_vn",
    },
    resolution: "64x64",
    format: "LED_BIN",
    frames: 90,
    price: 149000,
    isFree: false,
    submittedAt: "2026-10-29T21:10:00Z",
    thumbnailUrl: "🚗",
    tags: ["Cars", "JDM", "Windshield-Special"],
    status: "Pending Review",
  },
  {
    id: "queue-4",
    characterId: "c-pixel-hud-speedo",
    name: "Cyberpunk HUD Speedometer",
    designer: {
      name: "Dev_Pixel_K",
      avatar: "⚡",
      handle: "@dev_pixel_k",
    },
    resolution: "64x64",
    format: "LED_BIN",
    frames: 60,
    price: 0,
    isFree: true,
    submittedAt: "2026-10-29T18:30:00Z",
    thumbnailUrl: "⏱️",
    tags: ["HUD", "Free", "Dashboard"],
    status: "Pending Review",
  },
  {
    id: "queue-5",
    characterId: "c-sakura-tree-wind",
    name: "Sakura Breeze Animated",
    designer: {
      name: "Trâm Anh Artist",
      avatar: "🌸",
      handle: "@tram_pixel",
    },
    resolution: "16x16",
    format: "PNG_SPRITE",
    frames: 24,
    price: 49000,
    isFree: false,
    submittedAt: "2026-10-29T14:05:00Z",
    thumbnailUrl: "🌸",
    tags: ["Chill", "Anime", "Aesthetic"],
    status: "Pending Review",
  },
];

export const LOW_STOCK_LEDS_MOCK: LowStockLedItem[] = [
  {
    productId: "matrix-64",
    modelCode: "LED-64",
    name: "64 × 64 Matrix Pro High-Density",
    dimensions: "192mm × 192mm",
    currentStock: 15,
    minimumStock: 25,
    reserved: 8,
    unitPrice: 1890000,
    urgency: "CRITICAL",
  },
  {
    productId: "led-matrix-64x32",
    modelCode: "LED-64x32",
    name: "64 × 32 Matrix Panel Horizon",
    dimensions: "192mm × 96mm",
    currentStock: 18,
    minimumStock: 20,
    reserved: 4,
    unitPrice: 1290000,
    urgency: "LOW",
  },
  {
    productId: "led-pixel-bar",
    modelCode: "PIXEL-BAR-RGB",
    name: "PIXEL Bar RGB Windshield Strip",
    dimensions: "320mm × 24mm",
    currentStock: 7,
    minimumStock: 15,
    reserved: 3,
    unitPrice: 699000,
    urgency: "CRITICAL",
  },
];

export const WARRANTY_ALERTS_MOCK: WarrantyAlertItem[] = [
  {
    ticketId: "WAR-2026-089",
    customerName: "Nguyễn Văn Đạt",
    customerEmail: "dat.nguyen@example.com",
    deviceModel: "64 × 64 Matrix Pro",
    deviceSerial: "SN-LED64-90241A",
    issueDescription: "Cột pixel thứ 4 bên phải bị nhấp nháy khi nhiệt độ kính xe tăng cao.",
    reportedDate: "2026-10-30T08:10:00Z",
    status: "Under Inspection",
    priority: "High",
  },
  {
    ticketId: "WAR-2026-088",
    customerName: "Trần Bảo Long",
    customerEmail: "baolong.tran@gmail.com",
    deviceModel: "32 × 32 Matrix Panel",
    deviceSerial: "SN-LED32-44102B",
    issueDescription: "Cổng USB-C cấp nguồn chập chờn sau 2 tháng sử dụng.",
    reportedDate: "2026-10-29T16:20:00Z",
    status: "Replacement Approved",
    priority: "Medium",
  },
  {
    ticketId: "WAR-2026-085",
    customerName: "Lê Minh Tuấn",
    customerEmail: "minhtuan.le@carvn.com",
    deviceModel: "PIXEL Bar RGB Strip",
    deviceSerial: "SN-BAR-11029C",
    issueDescription: "Bluetooth chập chờn khi kết nối cùng lúc hệ thống xe hơi CarPlay.",
    reportedDate: "2026-10-28T11:45:00Z",
    status: "Pending RMA",
    priority: "Low",
  },
];

// =========================================================================
// ADMIN DASHBOARD MOCK DATA
// =========================================================================

export const ADMIN_KPI_MOCK: AdminKpiSummary = {
  totalUsers: 14892,
  totalEmployees: 42,
  userGrowthPercent: 24.6,
  activePairedDevices: 8642,
  devicesOnlineRate: 94.2,
  latestFirmwareAdoptionPercent: 91.4,
  latestFirmwareVersion: "v2.4.0-stable",
  activeRolesCount: 5,
  totalPermissionsCount: 38,
  securityIncidents: 0,
};

export const FIRMWARE_DISTRIBUTION_MOCK: FirmwareDistributionItem[] = [
  {
    version: "v2.4.0-stable",
    label: "v2.4.0 (Latest OTA)",
    deviceCount: 6395,
    percentage: 74,
    color: "#a7f3d0", // Mint
    releaseDate: "2026-10-15",
    isCurrent: true,
  },
  {
    version: "v2.3.2-patch",
    label: "v2.3.2 (Stable)",
    deviceCount: 1469,
    percentage: 17,
    color: "#fef08a", // Yellow
    releaseDate: "2026-09-02",
    isCurrent: false,
  },
  {
    version: "v2.2.0-lts",
    label: "v2.2.0 (Legacy LTS)",
    deviceCount: 605,
    percentage: 7,
    color: "#e9d5ff", // Lavender
    releaseDate: "2026-06-18",
    isCurrent: false,
  },
  {
    version: "v1.9.x",
    label: "v1.9.x (Outdated)",
    deviceCount: 173,
    percentage: 2,
    color: "#fed7aa", // Coral
    releaseDate: "2026-01-10",
    isCurrent: false,
  },
];

export const USER_ROLE_BREAKDOWN_MOCK: UserRoleBreakdownItem[] = [
  {
    role: "CUSTOMER",
    roleNameVi: "Khách hàng mua LED/Character",
    count: 14610,
    percentage: 98.1,
    color: "#a7f3d0", // Mint
    activeThisWeek: 9240,
  },
  {
    role: "DESIGNER",
    roleNameVi: "Pixel Art Designer",
    count: 240,
    percentage: 1.6,
    color: "#e9d5ff", // Lavender
    activeThisWeek: 182,
  },
  {
    role: "STAFF",
    roleNameVi: "Nhân viên vận hành & kho",
    count: 28,
    percentage: 0.19,
    color: "#fef08a", // Yellow
    activeThisWeek: 28,
  },
  {
    role: "MANAGER",
    roleNameVi: "Quản lý kinh doanh & Store",
    count: 10,
    percentage: 0.07,
    color: "#fed7aa", // Coral
    activeThisWeek: 10,
  },
  {
    role: "ADMIN",
    roleNameVi: "Quản trị viên hệ thống",
    count: 4,
    percentage: 0.03,
    color: "#ffffff", // White
    activeThisWeek: 4,
  },
];

export const RBAC_ACTIVITIES_MOCK: RbacActivityItem[] = [
  {
    id: "act-101",
    timestamp: "2026-10-30T09:12:00Z",
    actor: {
      name: "Nguyễn Hải (Root Admin)",
      email: "hai.admin@pixelhub.vn",
      role: "ADMIN",
    },
    targetUser: {
      name: "Trần Minh Quân",
      email: "quan.pixels@gmail.com",
    },
    actionType: "ROLE_CHANGE",
    actionLabel: "Cấp quyền Designer",
    previousRole: "CUSTOMER",
    newRole: "DESIGNER",
    details: "Duyệt hồ sơ portfolio pixel art 64x64. Mở quyền publish store review.",
    status: "SUCCESS",
  },
  {
    id: "act-102",
    timestamp: "2026-10-30T08:45:00Z",
    actor: {
      name: "Vũ Mai Phương",
      email: "phuong.sec@pixelhub.vn",
      role: "ADMIN",
    },
    targetUser: {
      name: "Lê Văn Hùng (Kho LED)",
      email: "hung.staff@pixelhub.vn",
    },
    actionType: "PERMISSION_GRANT",
    actionLabel: "Thêm quyền kiểm kho",
    details: "Gán quyền INVENTORY:IMPORT_CSV và WARRANTY:INSPECT.",
    status: "SUCCESS",
  },
  {
    id: "act-103",
    timestamp: "2026-10-29T22:15:00Z",
    actor: {
      name: "Hệ thống bảo mật tự động",
      email: "security-bot@pixelhub.vn",
      role: "SYSTEM",
    },
    targetUser: {
      name: "user_89201@tempmail.io",
      email: "user_89201@tempmail.io",
    },
    actionType: "ACCOUNT_SUSPENDED",
    actionLabel: "Tạm khóa tài khoản khả nghi",
    details: "Phát hiện 25 lần gọi API spam download character binary liên tiếp.",
    status: "FLAGGED",
  },
  {
    id: "act-104",
    timestamp: "2026-10-29T17:30:00Z",
    actor: {
      name: "Nguyễn Hải (Root Admin)",
      email: "hai.admin@pixelhub.vn",
      role: "ADMIN",
    },
    targetUser: {
      name: "Đặng Thuỳ Dương",
      email: "duong.dt@pixelhub.vn",
    },
    actionType: "ROLE_CHANGE",
    actionLabel: "Bổ nhiệm Manager Store",
    previousRole: "STAFF",
    newRole: "MANAGER",
    details: "Chuyển giao quyền duyệt Store Listing và cấu hình giá Bundle.",
    status: "SUCCESS",
  },
  {
    id: "act-105",
    timestamp: "2026-10-29T14:10:00Z",
    actor: {
      name: "Vũ Mai Phương",
      email: "phuong.sec@pixelhub.vn",
      role: "ADMIN",
    },
    targetUser: {
      name: "Phan Quốc Bảo",
      email: "bao.pq@pixelhub.vn",
    },
    actionType: "2FA_RESET",
    actionLabel: "Reset xác thực 2 lớp (2FA)",
    details: "Yêu cầu khôi phục sau khi đổi điện thoại di động mới.",
    status: "SUCCESS",
  },
];

export const FIRMWARE_RELEASES_MOCK: FirmwareReleaseItem[] = [
  {
    id: "fw-240",
    version: "v2.4.0-stable",
    buildNumber: "build-20261015-890",
    targetModels: ["LED-64", "LED-32", "PIXEL-BAR"],
    binarySize: "1.84 MB",
    releaseDate: "2026-10-15",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    status: "Released",
    rolloutPercentage: 100,
    downloadsCount: 6395,
    notes: "Tối ưu bộ đệm DMA cho ma trận 64x64, giảm độ trễ Bluetooth BLE khi xe đang di chuyển, chống hiện tượng bóng ma LED.",
  },
  {
    id: "fw-241-rc",
    version: "v2.4.1-rc1",
    buildNumber: "build-20261028-941",
    targetModels: ["LED-64x32", "LED-64"],
    binarySize: "1.86 MB",
    releaseDate: "2026-10-28",
    sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    status: "Staged",
    rolloutPercentage: 15,
    downloadsCount: 142,
    notes: "Thử nghiệm tính năng đồng bộ ánh sáng theo tốc độ GPS OBD-II và hiệu ứng phanh gấp.",
  },
  {
    id: "fw-250-alpha",
    version: "v2.5.0-alpha",
    buildNumber: "build-20261030-011",
    targetModels: ["ALL_MODELS"],
    binarySize: "2.12 MB",
    releaseDate: "2026-10-30",
    sha256: "c51121d58dca08f0a85a49856f4d11f62c5b746815efc1c5a278ec6e1f07da19",
    status: "Draft",
    rolloutPercentage: 0,
    downloadsCount: 0,
    notes: "Tích hợp codec nén hoạt ảnh Pixel v3, giải phóng 35% RAM ESP32-S3.",
  },
  {
    id: "fw-232",
    version: "v2.3.2-patch",
    buildNumber: "build-20260902-612",
    targetModels: ["LED-16", "LED-32"],
    binarySize: "1.42 MB",
    releaseDate: "2026-09-02",
    sha256: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    status: "Released",
    rolloutPercentage: 100,
    downloadsCount: 8120,
    notes: "Sửa lỗi crash khi nhận file font unicode kích thước lớn qua ứng dụng di động.",
  },
  {
    id: "fw-220",
    version: "v2.2.0-lts",
    buildNumber: "build-20260618-420",
    targetModels: ["LED-16", "LED-32", "LED-64"],
    binarySize: "1.38 MB",
    releaseDate: "2026-06-18",
    sha256: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
    status: "Deprecated",
    rolloutPercentage: 100,
    downloadsCount: 12450,
    notes: "Bản phát hành ổn định dài hạn (LTS). Ngừng hỗ trợ cập nhật tính năng mới.",
  },
];
