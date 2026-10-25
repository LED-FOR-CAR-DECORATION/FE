export const COMMISSION_FIELDS = [
  { key: "characterDesign", label: "Loại thiết kế nhân vật", description: "Chọn thiết kế mới hoặc thiết kế lại nhân vật" },
  { key: "complexity", label: "Độ phức tạp nhân vật", description: "Mức độ chi tiết của nhân vật" },
  { key: "animation", label: "Loại hoạt ảnh", description: "Nhân vật tĩnh hoặc có chuyển động" },
  { key: "frames", label: "Số khung hình hoạt ảnh", description: "Số khung hình" },
  { key: "details", label: "Chi tiết và phụ kiện thêm", description: "Trang phục, hiệu ứng hoặc đạo cụ đi kèm" },
  { key: "background", label: "Phông nền / Bối cảnh", description: "Mức độ phức tạp của phông nền" },
  { key: "characters", label: "Nhân vật bổ sung", description: "Số nhân vật bổ sung" },
  { key: "priority", label: "Mức ưu tiên giao hàng", description: "Thời gian hoàn thiện mong muốn" },
  { key: "license", label: "Giấy phép sử dụng", description: "Quyền sử dụng" },
  { key: "deliverables", label: "Sản phẩm bàn giao thêm", description: "Sản phẩm bàn giao thêm" },
] as const;

export type CommissionFieldKey = (typeof COMMISSION_FIELDS)[number]["key"];
export type CommissionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DesignerCommissionStatus = "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED_FOR_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "COMPLETED";
export type SubmissionStatus = "SUBMITTED_FOR_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";

export type CommissionSubmission = {
  id: string;
  version: number;
  title: string;
  file: { name: string; type: string; size: number; dataUrl?: string };
  note: string;
  status: SubmissionStatus;
  feedback?: string;
  revisionRequestId?: string;
  createdAt: string;
};

export type CommissionRevisionRequest = {
  id: string;
  number: number;
  request: string;
  staffNote?: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
};

export type CommissionOption = {
  value: string;
  label: string;
  surcharge: number | null;
};

export const COMMISSION_OPTIONS: Record<CommissionFieldKey, CommissionOption[]> = {
  characterDesign: [
    { value: "new", label: "Nhân vật mới", surcharge: 500000 },
    { value: "redesign", label: "Thiết kế lại nhân vật có sẵn", surcharge: 350000 },
  ],
  complexity: [
    { value: "simple", label: "Đơn giản", surcharge: 0 },
    { value: "standard", label: "Tiêu chuẩn", surcharge: 150000 },
    { value: "complex", label: "Phức tạp", surcharge: 400000 },
  ],
  animation: [
    { value: "static", label: "Nhân vật tĩnh", surcharge: 0 },
    { value: "simple-animation", label: "Hoạt ảnh đơn giản", surcharge: 250000 },
    { value: "complex-animation", label: "Hoạt ảnh phức tạp", surcharge: 600000 },
  ],
  frames: [
    { value: "static", label: "Tĩnh", surcharge: 0 },
    { value: "2-4", label: "2–4 khung hình", surcharge: 100000 },
    { value: "5-8", label: "5–8 khung hình", surcharge: 250000 },
  ],
  details: [
    { value: "basic", label: "Phụ kiện cơ bản", surcharge: 0 },
    { value: "outfit", label: "Trang phục phức tạp", surcharge: 200000 },
    { value: "effects", label: "Hiệu ứng đặc biệt", surcharge: 300000 },
    { value: "props", label: "Đạo cụ tùy chỉnh", surcharge: 250000 },
  ],
  background: [
    { value: "transparent", label: "Nền trong suốt / Không có nền", surcharge: 0 },
    { value: "simple", label: "Nền đơn giản", surcharge: 150000 },
    { value: "detailed", label: "Bối cảnh chi tiết (báo giá sau)", surcharge: null },
  ],
  characters: [
    { value: "one", label: "Một nhân vật", surcharge: 0 },
    { value: "plus-one", label: "+1 nhân vật", surcharge: 400000 },
    { value: "plus-two", label: "+2 nhân vật", surcharge: 750000 },
  ],
  priority: [
    { value: "standard", label: "Tiêu chuẩn", surcharge: 0 },
    { value: "rush", label: "Gấp", surcharge: 300000 },
  ],
  license: [
    { value: "personal", label: "Sử dụng cá nhân", surcharge: 0 },
    { value: "commercial", label: "Sử dụng thương mại", surcharge: 500000 },
  ],
  deliverables: [
    { value: "standard", label: "Đầu ra tiêu chuẩn", surcharge: 0 },
    { value: "expression", label: "Thêm biểu cảm", surcharge: 120000 },
    { value: "pose", label: "Tư thế / Màu sắc thay thế", surcharge: 150000 },
    { value: "source", label: "File nguồn", surcharge: 250000 },
  ],
};

export type CommissionRequest = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  selections: Record<CommissionFieldKey, string>;
  note: string;
  referenceImage?: {
    name: string;
    dataUrl: string;
  };
  assignedDesignerId?: string;
  assignedDesignerName?: string;
  assignmentDate?: string;
  designerStatus?: DesignerCommissionStatus;
  submissions?: CommissionSubmission[];
  revisions?: CommissionRevisionRequest[];
  estimatedPrice: number | null;
  status: CommissionStatus;
  createdAt: string;
};