"use client";

import { use } from "react";
import { DesignerCommissionOverview } from "@/features/commission/components/DesignerCommissionWorkspace";

export default function DesignerCommissionDetailsPage({ params }: { params: Promise<{ commissionId: string }> }) {
  const { commissionId } = use(params);
  const id = Number(commissionId);
  if (!/^\d+$/.test(commissionId) || !Number.isSafeInteger(id) || id < 1) {
    return <p className="py-16 text-center font-black">Mã commission không hợp lệ.</p>;
  }
  return <DesignerCommissionOverview key={id} commissionId={id} />;
}
