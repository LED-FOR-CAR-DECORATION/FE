"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CopyPlus,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Merge,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import type { PixelLayer } from "../domain/pixelDocument";

interface StudioLayersPanelProps {
  layers: PixelLayer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDuplicateLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onMergeDownLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: -1 | 1) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRenameLayer: (id: string, nextName: string) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
}

export default function StudioLayersPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onMergeDownLayer,
  onMoveLayer,
  onToggleVisible,
  onToggleLocked,
  onRenameLayer,
  onChangeOpacity,
}: StudioLayersPanelProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const activeIdx = layers.findIndex((l) => l.id === activeLayerId);
  const activeLayer = activeIdx >= 0 ? layers[activeIdx] : layers[0];

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameLayer(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="ase-panel">
      <div className="ase-panel-head flex items-center justify-between px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide">
        <span className="inline-flex items-center gap-1">
          <Layers size={12} /> Layers ({layers.length})
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onAddLayer}
            title="Thêm layer mới"
            aria-label="Thêm layer mới"
            className="ase-btn p-1"
          >
            <Plus size={11} />
          </button>
          <button
            type="button"
            onClick={onDuplicateLayer}
            title="Nhân bản layer hiện tại"
            aria-label="Nhân bản layer hiện tại"
            className="ase-btn p-1"
          >
            <CopyPlus size={11} />
          </button>
          <button
            type="button"
            disabled={activeIdx <= 0}
            onClick={() => activeLayer && onMoveLayer(activeLayer.id, -1)}
            title="Đưa layer lên trên"
            aria-label="Đưa layer lên trên"
            className="ase-btn p-1"
          >
            <ChevronUp size={11} />
          </button>
          <button
            type="button"
            disabled={activeIdx < 0 || activeIdx >= layers.length - 1}
            onClick={() => activeLayer && onMoveLayer(activeLayer.id, 1)}
            title="Đưa layer xuống dưới"
            aria-label="Đưa layer xuống dưới"
            className="ase-btn p-1"
          >
            <ChevronDown size={11} />
          </button>
          <button
            type="button"
            disabled={activeIdx < 0 || activeIdx >= layers.length - 1}
            onClick={() => activeLayer && onMergeDownLayer(activeLayer.id)}
            title="Gộp xuống layer bên dưới"
            aria-label="Gộp xuống layer bên dưới"
            className="ase-btn p-1"
          >
            <Merge size={11} />
          </button>
          <button
            type="button"
            disabled={layers.length <= 1 || !activeLayer}
            onClick={() => activeLayer && onDeleteLayer(activeLayer.id)}
            title="Xóa layer hiện tại"
            aria-label="Xóa layer hiện tại"
            className="ase-btn p-1 text-red-700"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div className="max-h-[128px] space-y-1 overflow-y-auto p-1.5">
        {layers.map((layer) => {
          const isSelected = layer.id === activeLayer?.id;
          const isRenaming = renamingId === layer.id;

          return (
            <div
              key={layer.id}
              className={`flex items-center gap-1 border px-1.5 py-1 text-[11px] transition-colors ${
                isSelected
                  ? "border-[#2d6a4f] bg-[#dcebe2] font-bold text-[#163d2c]"
                  : "border-[#dfe3e0] bg-white text-[#1f2a24] hover:bg-[#f5f7f6]"
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleVisible(layer.id)}
                title={layer.visible ? "Ẩn layer" : "Hiện layer"}
                aria-label={layer.visible ? `Ẩn ${layer.name}` : `Hiện ${layer.name}`}
                className="cursor-pointer p-0.5 text-[#4b554f] hover:text-[#1f2a24]"
              >
                {layer.visible ? <Eye size={12} /> : <EyeOff size={12} className="opacity-45" />}
              </button>

              <button
                type="button"
                onClick={() => onToggleLocked(layer.id)}
                title={layer.locked ? "Mở khóa layer" : "Khóa layer"}
                aria-label={layer.locked ? `Mở khóa ${layer.name}` : `Khóa ${layer.name}`}
                className="cursor-pointer p-0.5 text-[#4b554f] hover:text-[#1f2a24]"
              >
                {layer.locked ? (
                  <Lock size={11} className="text-amber-700" />
                ) : (
                  <Unlock size={11} className="opacity-40" />
                )}
              </button>

              {isRenaming ? (
                <input
                  type="text"
                  autoFocus
                  maxLength={40}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === "Escape") {
                      setRenamingId(null);
                    }
                  }}
                  className="ase-input min-w-0 flex-1 px-1 py-0.5 text-[11px]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectLayer(layer.id)}
                  onDoubleClick={() => {
                    setRenamingId(layer.id);
                    setRenameValue(layer.name);
                  }}
                  title="Bấm để chọn layer, bấm đúp để đổi tên"
                  className="min-w-0 flex-1 cursor-pointer truncate text-left"
                >
                  {layer.name}
                </button>
              )}

              <span className="shrink-0 font-mono text-[9px] text-[#4b554f]">
                {layer.opacity}%
              </span>
            </div>
          );
        })}
      </div>

      {activeLayer && (
        <div className="flex items-center gap-2 border-t border-[#dfe3e0] bg-[#f5f7f6] px-2.5 py-1.5 text-[10px] font-bold text-[#4b554f]">
          <span className="shrink-0">Độ mờ</span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={activeLayer.opacity}
            onChange={(e) => onChangeOpacity(activeLayer.id, Number(e.target.value))}
            aria-label={`Độ mờ của ${activeLayer.name}`}
            className="flex-1 accent-[#2d6a4f]"
          />
          <span className="w-7 text-right font-mono text-[#1f2a24]">
            {activeLayer.opacity}%
          </span>
        </div>
      )}
    </div>
  );
}
