import {
  commissionConfigs,
  type CommissionFieldConfig,
  type CommissionOptionConfig,
} from "./config/commissionConfigs";

export { commissionConfigs, type CommissionFieldConfig, type CommissionOptionConfig };

/**
 * Tương thích ngược từ mảng cấu hình động `commissionConfigs`
 */
export const COMMISSION_FIELDS = commissionConfigs.map((cfg) => ({
  key: cfg.key,
  label: cfg.fieldName,
  description: cfg.description,
  renderType: cfg.renderType,
}));

export type CommissionFieldKey = string;
export type CommissionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DesignerCommissionStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "COMPLETED";
export type SubmissionStatus =
  | "SUBMITTED_FOR_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

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

export const COMMISSION_OPTIONS: Record<string, CommissionOption[]> = Object.fromEntries(
  commissionConfigs.map((cfg) => [
    cfg.key,
    cfg.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      surcharge: opt.price,
    })),
  ])
);

export type CommissionRequest = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  selections: Record<string, string>;
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
