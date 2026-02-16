"use client";

import { useState, useRef } from "react";
import { Check } from "lucide-react";

function hsvToHex(h: number, s: number, v: number): string {
  const sVal = s / 100;
  const vVal = v / 100;
  const c = vVal * sVal;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vVal - c;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 100, v: 100 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    if (max === r) h = 60 * (((g - b) / diff) % 6);
    else if (max === g) h = 60 * ((b - r) / diff + 2);
    else h = 60 * ((r - g) / diff + 4);
  }
  if (h < 0) h += 360;

  const v = max * 100;
  const s = max === 0 ? 0 : (diff / max) * 100;

  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

const presetColors = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#6b7280",
  "#374151",
  "#1f2937",
  "#111827",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number } | null>(
    null,
  );
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const currentHsv = hsv ?? hexToHsv(value || "#6b7280");
  const hexValue = hsvToHex(currentHsv.h, currentHsv.s, currentHsv.v);
  const displayValue = value || "#6b7280";

  const handleClickOutside = (e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setShowPicker(false);
    }
  };

  const updateShowPicker = (show: boolean) => {
    setShowPicker(show);
    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  };

  const handleSvMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updateSv = (clientX: number, clientY: number) => {
      if (!svRef.current) return;
      const rect = svRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const newHsv = {
        h: currentHsv.h,
        s: Math.round(x * 100),
        v: Math.round((1 - y) * 100),
      };
      setHsv(newHsv);
      onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
    };
    updateSv(e.clientX, e.clientY);

    const handleMouseMove = (e: MouseEvent) => updateSv(e.clientX, e.clientY);
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updateHue = (clientX: number) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newHsv = { ...currentHsv, h: Math.round(x * 360) };
      setHsv(newHsv);
      onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
    };
    updateHue(e.clientX);

    const handleMouseMove = (e: MouseEvent) => updateHue(e.clientX);
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => updateShowPicker(!showPicker)}
        className="w-8 h-8 rounded-lg border border-border/50 cursor-pointer transition-transform hover:scale-105"
        style={{ backgroundColor: displayValue }}
      />
      {showPicker && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-card rounded-xl shadow-lg border border-border p-3 w-[220px]">
          <div
            ref={svRef}
            className="w-full h-32 rounded-lg cursor-cross mb-3 relative select-none"
            style={{
              backgroundColor: `hsl(${currentHsv.h}, 100%, 50%)`,
              backgroundImage:
                "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
            }}
            onMouseDown={handleSvMouseDown}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md"
              style={{
                left: `${currentHsv.s}%`,
                top: `${100 - currentHsv.v}%`,
                transform: "translate(-50%, -50%)",
                backgroundColor: hexValue,
              }}
            />
          </div>

          <div
            ref={hueRef}
            className="w-full h-4 rounded-full cursor-pointer mb-3 relative select-none"
            style={{
              background:
                "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            }}
            onMouseDown={handleHueMouseDown}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md"
              style={{
                left: `${(currentHsv.h / 360) * 100}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: `hsl(${currentHsv.h}, 100%, 50%)`,
              }}
            />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg border border-border"
              style={{ backgroundColor: hexValue }}
            />
            <input
              type="text"
              value={hexValue.toUpperCase()}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  setHsv(hexToHsv(val));
                }
              }}
              onBlur={() => onChange(hexValue)}
              className="w-full flex-1 h-8 px-2 text-xs font-mono bg-background border border-border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-8 gap-1">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  setHsv(hexToHsv(color));
                  onChange(color);
                }}
                className="w-5 h-5 rounded-md transition-transform hover:scale-110 relative"
                style={{ backgroundColor: color }}
              >
                {hexValue.toLowerCase() === color && (
                  <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
