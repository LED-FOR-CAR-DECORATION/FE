import { COMMISSION_FIELDS, type CommissionFieldKey } from "./types";

export function validateCommissionSelections(selections: Partial<Record<CommissionFieldKey, string>>) {
  return COMMISSION_FIELDS.every(({ key }) => Boolean(selections[key]));
}