"use client";

import { useEffect, useState } from "react";
import {
  commissionConfigs,
  loadCommissionConfigs,
  saveCommissionConfigs,
  type CommissionFieldConfig,
} from "../config/commissionConfigs";

export function useCommissionConfigs() {
  const [configs, setConfigs] = useState<CommissionFieldConfig[]>(commissionConfigs);

  useEffect(() => {
    setConfigs(loadCommissionConfigs());

    const handleSync = () => {
      setConfigs(loadCommissionConfigs());
    };
    window.addEventListener("mirage-commission-configs-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("mirage-commission-configs-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const updateConfigs = (next: CommissionFieldConfig[]) => {
    setConfigs(next);
    saveCommissionConfigs(next);
  };

  return { configs, updateConfigs };
}

