"use client";

import { useState } from "react";
import { AlertCircle, Loader2, PackagePlus, Plus, Sparkles, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  apiStockInLedInstances,
  formatLedInventoryError,
  type StockInLedInstancesResult,
} from "@/lib/api/ledInstances";
import type { ManagedLedModelItem } from "@/lib/api/ledModels";

interface StockInRow {
  key: string;
  serialNumber: string;
  macAddress: string;
}

interface StockInLedInstancesModalProps {
  model: ManagedLedModelItem;
  onClose: () => void;
  onSuccess: (result: StockInLedInstancesResult) => void;
}

const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

function randomHexByte(): string {
  return Math.floor(Math.random() * 256)
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
}

function buildGeneratedRows(
  model: ManagedLedModelItem,
  count: number,
): StockInRow[] {
  const dim =
    model.spec?.widthPx && model.spec?.heightPx
      ? `${model.spec.widthPx}X${model.spec.heightPx}`
      : `M${model.modelId}`;
  const now = new Date();
  const stamp = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const macOctet3 = randomHexByte();
  const macOctet4 = randomHexByte();
  const baseOctet5 = Math.floor(Math.random() * 150) + 1;

  const rows: StockInRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const seq = String(i + 1).padStart(3, "0");
    const lastByte = ((baseOctet5 + i) % 254) + 1;
    rows.push({
      key: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      serialNumber: `LMT-${dim}-M${model.modelId}-${stamp}-${seq}`,
      macAddress: `AA:BB:${macOctet3}:${macOctet4}:${String(model.modelId % 99).padStart(2, "0")}:${lastByte
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")}`,
    });
  }
  return rows;
}

function createEmptyRow(): StockInRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    serialNumber: "",
    macAddress: "",
  };
}

export default function StockInLedInstancesModal({
  model,
  onClose,
  onSuccess,
}: StockInLedInstancesModalProps) {
  const [batchCount, setBatchCount] = useState("5");
  const [rows, setRows] = useState<StockInRow[]>(() =>
    buildGeneratedRows(model, 1),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (
    key: string,
    field: keyof Omit<StockInRow, "key">,
    value: string,
  ) => {
    setError(null);
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  };

  const handleRemoveRow = (key: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  };

  const handleAddRow = () => {
    setError(null);
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleGenerateBatch = () => {
    const parsed = Number(batchCount);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      setError("Số lượng tạo nhanh mỗi lô phải là số nguyên từ 1 đến 50.");
      return;
    }
    setError(null);
    setRows(buildGeneratedRows(model, parsed));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rows.length === 0) {
      setError("Cần ít nhất 1 thiết bị (Serial & MAC) để nhập kho.");
      return;
    }

    const seenSerials = new Set<string>();
    const seenMacs = new Set<string>();
    const items = [];

    for (let i = 0; i < rows.length; i += 1) {
      const serial = rows[i].serialNumber.trim();
      const mac = rows[i].macAddress.trim().toUpperCase();

      if (!serial) {
        setError(`Dòng #${i + 1}: Vui lòng nhập Serial Number.`);
        return;
      }
      if (serial.length > 100) {
        setError(`Dòng #${i + 1}: Serial Number tối đa 100 ký tự.`);
        return;
      }
      const serialKey = serial.toUpperCase();
      if (seenSerials.has(serialKey)) {
        setError(`Dòng #${i + 1}: Serial Number "${serial}" bị trùng trong danh sách.`);
        return;
      }
      seenSerials.add(serialKey);

      if (!MAC_REGEX.test(mac)) {
        setError(
          `Dòng #${i + 1}: Địa chỉ MAC phải đúng định dạng XX:XX:XX:XX:XX:XX (ví dụ AA:BB:CC:11:22:33).`,
        );
        return;
      }
      if (seenMacs.has(mac)) {
        setError(`Dòng #${i + 1}: Địa chỉ MAC "${mac}" bị trùng trong danh sách.`);
        return;
      }
      seenMacs.add(mac);

      items.push({
        serialNumber: serial,
        macAddress: mac,
      });
    }

    setIsSubmitting(true);
    try {
      const result = await apiStockInLedInstances({
        modelId: model.modelId,
        items,
      });
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(
        formatLedInventoryError(
          err,
          "Không thể nhập kho thiết bị LED. Vui lòng thử lại.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Nhập kho thiết bị · ${model.modelName}`}
      description={`Mỗi thiết bị nhập kho phải có Serial Number và địa chỉ MAC duy nhất. Tồn kho mẫu #${model.modelId} hiện tại: ${model.stockQuantity}.`}
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="stock-in-led-instances-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-primary px-5 py-2 text-sm font-black text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Đang nhập kho...
              </>
            ) : (
              <>
                <PackagePlus size={15} />
                Nhập {rows.length} thiết bị vào kho
              </>
            )}
          </button>
        </>
      }
    >
      <form
        id="stock-in-led-instances-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 text-sm"
      >
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick batch generator */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#dbece0] bg-[#f9fdfa] p-3.5">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              Số lượng tạo nhanh
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={batchCount}
              onChange={(e) => setBatchCount(e.target.value)}
              className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-bold outline-none focus:border-[#439660]"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateBatch}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#439660] bg-white px-3.5 py-2 text-xs font-bold text-[#1f432b] transition hover:bg-primary/20"
          >
            <Sparkles size={14} />
            Tạo nhanh mã lô
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50"
          >
            <Plus size={14} />
            Thêm 1 dòng
          </button>
        </div>

        {/* Rows table */}
        <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-[11px] font-black uppercase text-gray-600">
              <tr>
                <th className="w-10 px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5">Serial Number *</th>
                <th className="px-3 py-2.5">Địa chỉ MAC *</th>
                <th className="w-12 px-2 py-2.5 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row, index) => (
                <tr key={row.key}>
                  <td className="px-3 py-2 text-center font-mono font-bold text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={row.serialNumber}
                      onChange={(e) =>
                        updateRow(row.key, "serialNumber", e.target.value)
                      }
                      placeholder="LMT-64X64-M1-0011"
                      className="w-full rounded border border-gray-300 px-2.5 py-1.5 font-mono text-xs outline-none focus:border-[#439660]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      required
                      maxLength={17}
                      value={row.macAddress}
                      onChange={(e) =>
                        updateRow(
                          row.key,
                          "macAddress",
                          e.target.value.toUpperCase(),
                        )
                      }
                      placeholder="AA:BB:CC:11:22:33"
                      className="w-full rounded border border-gray-300 px-2.5 py-1.5 font-mono text-xs uppercase outline-none focus:border-[#439660]"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.key)}
                      disabled={rows.length <= 1}
                      aria-label={`Xóa dòng ${index + 1}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-text-muted">
          Sau khi nhập kho, tất cả thiết bị sẽ ở trạng thái <strong>Trong kho (IN_STOCK)</strong>,
          tự động có mã QR nhà máy để in tem và cộng thẳng <strong>+{rows.length}</strong> vào tồn
          kho mẫu LED (mới: <strong>{(model.stockQuantity ?? 0) + rows.length}</strong>).
        </p>
      </form>
    </Modal>
  );
}
