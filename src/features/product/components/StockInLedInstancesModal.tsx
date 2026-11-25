"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, PackagePlus, Plus, Sparkles, Trash2, X } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);
  const [batchCount, setBatchCount] = useState("5");
  const [rows, setRows] = useState<StockInRow[]>(() =>
    buildGeneratedRows(model, 1),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const isSubmittingRef = useRef(isSubmitting);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
    isSubmittingRef.current = isSubmitting;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmittingRef.current) {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

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

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 font-sans text-text-main"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0_0_#000] outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b-2 border-black bg-primary/20 px-6 py-4">
          <div className="min-w-0">
            <span className="inline-flex items-center border border-black bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_0_#000]">
              NHẬP KHO THIẾT BỊ · MẪU #{model.modelId}
            </span>
            <h2
              id={titleId}
              className="mt-1.5 text-base font-black uppercase tracking-tight text-black sm:text-lg"
            >
              Nhập kho thiết bị · {model.modelName}
            </h2>
            <p id={descriptionId} className="mt-0.5 text-xs font-medium text-text-muted">
              Mỗi thiết bị nhập kho phải có Serial Number và địa chỉ MAC duy nhất. Tồn kho mẫu #{model.modelId} hiện tại:{" "}
              <strong className="font-black text-black tabular-nums">{model.stockQuantity}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
            className="btn-secondary p-1.5! shadow-[2px_2px_0_0_#000]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <form
            id="stock-in-led-instances-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 text-sm"
          >
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 border-2 border-black bg-[#fee2e2] p-3 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick batch generator */}
            <div className="flex flex-wrap items-end gap-3 border-2 border-black bg-[#f3faf5] p-3.5 shadow-[2px_2px_0_0_#000]">
              <div>
                <label
                  htmlFor="stock-in-batch-count"
                  className="mb-1 block text-[11px] font-black uppercase tracking-wider text-black"
                >
                  Số lượng tạo nhanh
                </label>
                <input
                  id="stock-in-batch-count"
                  type="number"
                  min={1}
                  max={50}
                  value={batchCount}
                  onChange={(e) => setBatchCount(e.target.value)}
                  className="w-28 border-2 border-black bg-white px-3 py-1.5 text-xs font-black text-black tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateBatch}
                className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                <Sparkles size={14} aria-hidden="true" />
                Tạo nhanh mã lô
              </button>

              <button
                type="button"
                onClick={handleAddRow}
                className="btn-secondary ml-auto inline-flex items-center gap-1 px-3 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
              >
                <Plus size={14} aria-hidden="true" />
                Thêm 1 dòng
              </button>
            </div>

            {/* Rows table */}
            <div className="max-h-[45vh] overflow-y-auto border-2 border-black bg-white shadow-[4px_4px_0_0_#000]">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b-2 border-black bg-[#e9f5ed] text-[11px] font-black uppercase tracking-wider text-black">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-center">#</th>
                    <th className="px-3 py-2.5">Serial Number *</th>
                    <th className="px-3 py-2.5">Địa chỉ MAC *</th>
                    <th className="w-12 px-2 py-2.5 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10 bg-white">
                  {rows.map((row, index) => (
                    <tr key={row.key} className="transition-colors hover:bg-[#f3faf5]">
                      <td className="px-3 py-2 text-center font-mono font-black text-black tabular-nums">
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
                          aria-label={`Serial Number dòng ${index + 1}`}
                          className="w-full border-2 border-black bg-gray-50 px-2.5 py-1.5 font-mono text-xs font-bold text-black focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
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
                          aria-label={`Địa chỉ MAC dòng ${index + 1}`}
                          className="w-full border-2 border-black bg-gray-50 px-2.5 py-1.5 font-mono text-xs font-bold uppercase text-black focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.key)}
                          disabled={rows.length <= 1}
                          aria-label={`Xóa dòng ${index + 1}`}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border-2 border-black bg-white text-red-700 transition-colors hover:bg-[#fecaca] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-2 border-black bg-primary/15 px-3.5 py-2.5 text-xs font-medium text-black">
              Sau khi nhập kho, tất cả thiết bị sẽ ở trạng thái{" "}
              <strong className="font-black">Trong kho (IN_STOCK)</strong>, tự động có mã QR nhà máy để in tem và cộng thẳng{" "}
              <strong className="font-black tabular-nums">+{rows.length}</strong> vào tồn kho mẫu LED (mới:{" "}
              <strong className="font-black text-primary-ink tabular-nums">
                {(model.stockQuantity ?? 0) + rows.length}
              </strong>
              ).
            </div>
          </form>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t-2 border-dashed border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="stock-in-led-instances-form"
            disabled={isSubmitting}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_#000]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Đang nhập kho...
              </>
            ) : (
              <>
                <PackagePlus size={14} aria-hidden="true" />
                Nhập {rows.length} thiết bị vào kho
              </>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
