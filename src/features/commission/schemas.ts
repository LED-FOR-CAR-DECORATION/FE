import {
  commissionConfigs,
  type CommissionFieldConfig,
} from "./config/commissionConfigs";

export function validateCommissionSelections(
  selections: Record<string, string | undefined>,
  configs: CommissionFieldConfig[] = commissionConfigs
) {
  return configs
    .filter((cfg) => cfg.required)
    .every((cfg) => Boolean(selections[cfg.key]));
}
