export type OrderState = "NO_ORDER" | "IN_PROGRESS" | "REVIEW";
export type ProgressStep = "WAITING_PAYMENT" | "DRAWING" | "REVIEWING";

export interface QuoteSpecItem {
  fieldKey: string;
  fieldName: string;
  optionLabel: string;
  price: number | null;
}

export interface QuoteData {
  characterName: string;
  description: string;
  price: number;
  deliveryDate: string;
  isPaid?: boolean;
  isApproved?: boolean;
  /** Lưu các tùy chọn động được chọn từ mảng `commissionConfigs` */
  selections?: Record<string, string>;
  /** Danh sách chi tiết các tiêu chí đã chọn từ `commissionConfigs` */
  specsBreakdown?: QuoteSpecItem[];
}

export interface ChatMessage {
  id: string;
  sender: "CUSTOMER" | "STAFF" | "SYSTEM";
  text?: string;
  time: string;
  imageUrl?: string;
  quoteCard?: QuoteData;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerAvatar: string;
  staffName: string;
  staffAvatar: string;
  online: boolean;
  lastMessage: string;
  lastTime: string;
  unreadCount?: number;
  orderState: OrderState;
  progressStep: ProgressStep;
  commission: QuoteData;
  messages: ChatMessage[];
}
