export const COMMISSION_FIELDS = [
  { key: "characterDesign", label: "Character Design Type", description: "Loại thiết kế nhân vật" },
  { key: "complexity", label: "Character Complexity", description: "Độ phức tạp nhân vật" },
  { key: "animation", label: "Animation Type", description: "Loại animation" },
  { key: "frames", label: "Animation Frame Count", description: "Số khung hình" },
  { key: "details", label: "Additional Details / Accessories", description: "Phụ kiện và chi tiết thêm" },
  { key: "background", label: "Background / Scene", description: "Bối cảnh" },
  { key: "characters", label: "Additional Character", description: "Số nhân vật bổ sung" },
  { key: "priority", label: "Delivery Priority", description: "Độ ưu tiên giao hàng" },
  { key: "license", label: "Usage License", description: "Quyền sử dụng" },
  { key: "deliverables", label: "Additional Deliverables", description: "Sản phẩm bàn giao thêm" },
] as const;

export type CommissionFieldKey = (typeof COMMISSION_FIELDS)[number]["key"];
export type CommissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type CommissionOption = {
  value: string;
  label: string;
  surcharge: number | null;
};

export const COMMISSION_OPTIONS: Record<CommissionFieldKey, CommissionOption[]> = {
  characterDesign: [
    { value: "new", label: "New Character", surcharge: 500000 },
    { value: "redesign", label: "Redesign Existing Character", surcharge: 350000 },
  ],
  complexity: [
    { value: "simple", label: "Simple", surcharge: 0 },
    { value: "standard", label: "Standard", surcharge: 150000 },
    { value: "complex", label: "Complex", surcharge: 400000 },
  ],
  animation: [
    { value: "static", label: "Static Character", surcharge: 0 },
    { value: "simple-animation", label: "Simple Animation", surcharge: 250000 },
    { value: "complex-animation", label: "Complex Animation", surcharge: 600000 },
  ],
  frames: [
    { value: "static", label: "Static", surcharge: 0 },
    { value: "2-4", label: "2–4 Frames", surcharge: 100000 },
    { value: "5-8", label: "5–8 Frames", surcharge: 250000 },
  ],
  details: [
    { value: "basic", label: "Basic Accessories", surcharge: 0 },
    { value: "outfit", label: "Complex Outfit", surcharge: 200000 },
    { value: "effects", label: "Special Effects", surcharge: 300000 },
    { value: "props", label: "Custom Props", surcharge: 250000 },
  ],
  background: [
    { value: "transparent", label: "Transparent/No Background", surcharge: 0 },
    { value: "simple", label: "Simple Background", surcharge: 150000 },
    { value: "detailed", label: "Detailed Scene (báo giá sau)", surcharge: null },
  ],
  characters: [
    { value: "one", label: "One Character", surcharge: 0 },
    { value: "plus-one", label: "+1 Character", surcharge: 400000 },
    { value: "plus-two", label: "+2 Characters", surcharge: 750000 },
  ],
  priority: [
    { value: "standard", label: "Standard", surcharge: 0 },
    { value: "rush", label: "Rush", surcharge: 300000 },
  ],
  license: [
    { value: "personal", label: "Personal Use", surcharge: 0 },
    { value: "commercial", label: "Commercial Use", surcharge: 500000 },
  ],
  deliverables: [
    { value: "standard", label: "Standard Output", surcharge: 0 },
    { value: "expression", label: "Extra Expression", surcharge: 120000 },
    { value: "pose", label: "Alternate Pose/Color", surcharge: 150000 },
    { value: "source", label: "Source File", surcharge: 250000 },
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
  estimatedPrice: number | null;
  status: CommissionStatus;
  createdAt: string;
};