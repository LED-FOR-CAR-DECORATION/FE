import type { CharacterVersion, StoreCharacter, StoreListing } from "./types";

/**
 * Mock data theo Conceptual ERD (doc/ERD.md).
 *
 * Kịch bản nghiệp vụ:
 * - Pending Review: Chưa có version nào liên kết với listing (Store chưa có phiên bản tham chiếu).
 * - Published: Store tham chiếu phiên bản do Manager chọn, KHÔNG tự động là bản cao nhất (BR-10).
 * - Hidden: Ghi nhớ version đã publish gần nhất nhưng không tự động khôi phục khi republish.
 */

const DESIGNERS = {
  linh: { id: "mock-designer-001", name: "Designer 123" },
  minh: { id: "usr-designer-002", name: "Trần Minh Khoa" },
  an: { id: "usr-designer-003", name: "Lê Thảo An" },
  huy: { id: "usr-designer-004", name: "Phạm Quốc Huy" },
} as const;

const IMG = "/images/products/characters";

export const SEED_LISTINGS: StoreListing[] = [
  { listingId: "LST-1001", publisherUserId: null, price: 85750, isFree: false, status: "Pending Review", publishedAt: null, updatedAt: "2026-10-22T08:10:00.000Z" },
  { listingId: "LST-1002", publisherUserId: null, price: 98000, isFree: false, status: "Pending Review", publishedAt: null, updatedAt: "2026-10-23T03:25:00.000Z" },
  { listingId: "LST-1003", publisherUserId: null, price: 69000, isFree: false, status: "Pending Review", publishedAt: null, updatedAt: "2026-10-24T09:40:00.000Z" },
  { listingId: "LST-1004", publisherUserId: "mock-manager-001", price: 110250, isFree: false, status: "Published", publishedAt: "2026-10-10T04:00:00.000Z", updatedAt: "2026-10-18T07:30:00.000Z" },
  { listingId: "LST-1005", publisherUserId: "mock-manager-001", price: 61250, isFree: false, status: "Published", publishedAt: "2026-10-05T06:15:00.000Z", updatedAt: "2026-10-05T06:15:00.000Z" },
  { listingId: "LST-1006", publisherUserId: "mock-manager-001", price: 0, isFree: true, status: "Published", publishedAt: "2026-09-28T02:00:00.000Z", updatedAt: "2026-10-12T10:00:00.000Z" },
  { listingId: "LST-1007", publisherUserId: "mock-manager-001", price: 147000, isFree: false, status: "Hidden", publishedAt: "2026-09-15T05:00:00.000Z", updatedAt: "2026-10-20T11:20:00.000Z" },
  { listingId: "LST-1008", publisherUserId: "mock-manager-001", price: 39000, isFree: false, status: "Hidden", publishedAt: "2026-09-20T05:00:00.000Z", updatedAt: "2026-10-21T01:45:00.000Z" },
];

export const SEED_CHARACTERS: StoreCharacter[] = [
  { characterId: "CHR-001", name: "Mirage Cat Hero", description: "Chú mèo pixel năng động với hoạt ảnh chào mừng.", thumbnailUrl: `${IMG}/mirage-cat.png`, creatorUserId: DESIGNERS.linh.id, creatorName: DESIGNERS.linh.name, listingId: "LST-1001", visibility: "Hidden", status: "Pending Review", createdAt: "2026-10-20T02:00:00.000Z", updatedAt: "2026-10-22T08:10:00.000Z" },
  { characterId: "CHR-002", name: "Space Robot", description: "Robot không gian vui nhộn với màn hình phát sáng.", thumbnailUrl: `${IMG}/space-robot.png`, creatorUserId: DESIGNERS.minh.id, creatorName: DESIGNERS.minh.name, listingId: "LST-1002", visibility: "Hidden", status: "Pending Review", createdAt: "2026-10-21T04:30:00.000Z", updatedAt: "2026-10-23T03:25:00.000Z" },
  { characterId: "CHR-003", name: "Pixel Wizard", description: "Pháp sư pixel với hiệu ứng phép thuật lấp lánh.", thumbnailUrl: `${IMG}/pixel-wizard.png`, creatorUserId: DESIGNERS.an.id, creatorName: DESIGNERS.an.name, listingId: "LST-1003", visibility: "Hidden", status: "Pending Review", createdAt: "2026-10-22T09:00:00.000Z", updatedAt: "2026-10-24T09:40:00.000Z" },
  { characterId: "CHR-004", name: "Neon Ninja", description: "Ninja pixel với khăn choàng chuyển động.", thumbnailUrl: `${IMG}/neon-ninja.png`, creatorUserId: DESIGNERS.minh.id, creatorName: DESIGNERS.minh.name, listingId: "LST-1004", visibility: "Visible", status: "Published", createdAt: "2026-09-30T03:00:00.000Z", updatedAt: "2026-10-18T07:30:00.000Z" },
  { characterId: "CHR-005", name: "Cherry Bloom", description: "Cành hoa anh đào pixel với hiệu ứng nở nhẹ.", thumbnailUrl: `${IMG}/cherry-bloom.png`, creatorUserId: DESIGNERS.an.id, creatorName: DESIGNERS.an.name, listingId: "LST-1005", visibility: "Visible", status: "Published", createdAt: "2026-09-25T06:00:00.000Z", updatedAt: "2026-10-05T06:15:00.000Z" },
  { characterId: "CHR-006", name: "Heartbeat", description: "Biểu tượng trái tim pixel nhấp nháy.", thumbnailUrl: `${IMG}/heartbeat.png`, creatorUserId: DESIGNERS.linh.id, creatorName: DESIGNERS.linh.name, listingId: "LST-1006", visibility: "Visible", status: "Published", createdAt: "2026-09-18T01:00:00.000Z", updatedAt: "2026-10-12T10:00:00.000Z" },
  { characterId: "CHR-007", name: "Mini Dragon", description: "Rồng pixel nhỏ với hoạt ảnh vỗ cánh.", thumbnailUrl: `${IMG}/mini-dragon.png`, creatorUserId: DESIGNERS.huy.id, creatorName: DESIGNERS.huy.name, listingId: "LST-1007", visibility: "Hidden", status: "Hidden", createdAt: "2026-09-05T02:30:00.000Z", updatedAt: "2026-10-20T11:20:00.000Z" },
  { characterId: "CHR-008", name: "Lazy Frog", description: "Chú ếch pixel thư giãn với hoạt ảnh chớp mắt.", thumbnailUrl: `${IMG}/lazy-frog.png`, creatorUserId: DESIGNERS.huy.id, creatorName: DESIGNERS.huy.name, listingId: "LST-1008", visibility: "Hidden", status: "Hidden", createdAt: "2026-09-10T08:00:00.000Z", updatedAt: "2026-10-21T01:45:00.000Z" },
];

type VersionSeed = Omit<CharacterVersion, "fileUrl" | "ledBinaryUrl" | "format"> & { format?: string };

function version(seed: VersionSeed): CharacterVersion {
  const base = `/uploads/characters/${seed.characterId.toLowerCase()}/v${seed.versionNumber}`;
  const format = seed.format ?? "GIF";
  return { ...seed, format, fileUrl: `${base}.${format.toLowerCase()}`, ledBinaryUrl: `${base}.ledbin` };
}

export const SEED_VERSIONS: CharacterVersion[] = [
  // CHR-001 — Pending Review, 3 bản upload, chưa liên kết với Store.
  version({ versionId: "VER-0101", characterId: "CHR-001", storeListingId: null, versionNumber: 1, width: 32, height: 32, frameCount: 8, frameDelayMs: 120, byteSize: 18432, changelog: "Bản upload đầu tiên — vòng lặp chuyển động cơ bản.", isCurrent: false, createdAt: "2026-10-20T02:00:00.000Z" }),
  version({ versionId: "VER-0102", characterId: "CHR-001", storeListingId: null, versionNumber: 2, width: 32, height: 32, frameCount: 12, frameDelayMs: 100, byteSize: 26624, changelog: "Làm mượt hoạt ảnh đuôi mèo, sửa lỗi dải màu ở phần tai.", isCurrent: false, createdAt: "2026-10-21T07:20:00.000Z" }),
  version({ versionId: "VER-0103", characterId: "CHR-001", storeListingId: null, versionNumber: 3, width: 32, height: 32, frameCount: 16, frameDelayMs: 90, byteSize: 35840, changelog: "Bổ sung hoạt ảnh vẫy tay chào. Dung lượng lớn hơn, khuyến nghị kiểm tra trên bộ điều khiển cấp thấp.", isCurrent: true, createdAt: "2026-10-22T08:10:00.000Z" }),

  // CHR-002 — Pending Review, 2 bản upload.
  version({ versionId: "VER-0201", characterId: "CHR-002", storeListingId: null, versionNumber: 1, width: 64, height: 32, frameCount: 10, frameDelayMs: 110, byteSize: 40960, changelog: "Bản phác thảo đầu tiên cho chu kỳ di chuyển của robot.", isCurrent: false, createdAt: "2026-10-21T04:30:00.000Z" }),
  version({ versionId: "VER-0202", characterId: "CHR-002", storeListingId: null, versionNumber: 2, width: 64, height: 32, frameCount: 14, frameDelayMs: 100, byteSize: 53248, changelog: "Hiệu ứng kính phát sáng và ăng-ten chớp nháy.", isCurrent: true, createdAt: "2026-10-23T03:25:00.000Z" }),

  // CHR-003 — Pending Review, 1 bản upload.
  version({ versionId: "VER-0301", characterId: "CHR-003", storeListingId: null, versionNumber: 1, format: "PNG", width: 32, height: 32, frameCount: 1, frameDelayMs: 0, byteSize: 4096, changelog: "Khung hình sprite tĩnh, hiệu ứng niệm phép sẽ bổ sung sau.", isCurrent: true, createdAt: "2026-10-24T09:40:00.000Z" }),

  // CHR-004 — Published ở v2 dù đã có v3 (Minh họa BR-10: Store giữ version do Manager chọn).
  version({ versionId: "VER-0401", characterId: "CHR-004", storeListingId: null, versionNumber: 1, width: 32, height: 32, frameCount: 6, frameDelayMs: 100, byteSize: 15360, changelog: "Bản upload ban đầu.", isCurrent: false, createdAt: "2026-09-30T03:00:00.000Z" }),
  version({ versionId: "VER-0402", characterId: "CHR-004", storeListingId: "LST-1004", versionNumber: 2, width: 32, height: 32, frameCount: 10, frameDelayMs: 90, byteSize: 24576, changelog: "Cải thiện chuyển động vật lý của dải khăn choàng.", isCurrent: false, createdAt: "2026-10-08T05:10:00.000Z" }),
  version({ versionId: "VER-0403", characterId: "CHR-004", storeListingId: null, versionNumber: 3, width: 32, height: 32, frameCount: 18, frameDelayMs: 80, byteSize: 61440, changelog: "Thử nghiệm đòn lướt nhanh — Designer mới tải lên, chưa qua duyệt.", isCurrent: true, createdAt: "2026-10-17T10:00:00.000Z" }),

  // CHR-005 — Published, 2 bản upload.
  version({ versionId: "VER-0501", characterId: "CHR-005", storeListingId: "LST-1005", versionNumber: 1, width: 16, height: 16, frameCount: 8, frameDelayMs: 140, byteSize: 6144, changelog: "Hoạt ảnh nụ hoa nở rộ.", isCurrent: false, createdAt: "2026-09-25T06:00:00.000Z" }),
  version({ versionId: "VER-0502", characterId: "CHR-005", storeListingId: null, versionNumber: 2, width: 16, height: 16, frameCount: 12, frameDelayMs: 120, byteSize: 8192, changelog: "Bổ sung hiệu ứng cánh hoa rơi nhẹ nhàng.", isCurrent: true, createdAt: "2026-10-03T08:45:00.000Z" }),

  // CHR-006 — Published (miễn phí), 1 bản upload.
  version({ versionId: "VER-0601", characterId: "CHR-006", storeListingId: "LST-1006", versionNumber: 1, width: 16, height: 16, frameCount: 4, frameDelayMs: 200, byteSize: 2048, changelog: "Hoạt ảnh nhịp tim đập tuần hoàn.", isCurrent: true, createdAt: "2026-09-18T01:00:00.000Z" }),

  // CHR-007 — Hidden; bản publish trước đó là v1, v2 mới được tải lên sau đó.
  version({ versionId: "VER-0701", characterId: "CHR-007", storeListingId: "LST-1007", versionNumber: 1, width: 32, height: 32, frameCount: 8, frameDelayMs: 110, byteSize: 20480, changelog: "Vòng lặp vỗ cánh bay.", isCurrent: false, createdAt: "2026-09-05T02:30:00.000Z" }),
  version({ versionId: "VER-0702", characterId: "CHR-007", storeListingId: null, versionNumber: 2, width: 32, height: 32, frameCount: 14, frameDelayMs: 90, byteSize: 38912, changelog: "Hiệu ứng hạt lửa phun trào.", isCurrent: true, createdAt: "2026-10-14T09:00:00.000Z" }),

  // CHR-008 — Hidden; 2 bản upload, v2 là bản đã publish trước khi ẩn.
  version({ versionId: "VER-0801", characterId: "CHR-008", storeListingId: null, versionNumber: 1, width: 16, height: 16, frameCount: 4, frameDelayMs: 300, byteSize: 3072, changelog: "Hoạt ảnh chớp mắt cơ bản.", isCurrent: false, createdAt: "2026-09-10T08:00:00.000Z" }),
  version({ versionId: "VER-0802", characterId: "CHR-008", storeListingId: "LST-1008", versionNumber: 2, width: 16, height: 16, frameCount: 6, frameDelayMs: 260, byteSize: 4608, changelog: "Bổ sung hoạt ảnh thè lưỡi thư giãn.", isCurrent: true, createdAt: "2026-09-19T11:00:00.000Z" }),
];
