"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface ThemedDropdownOption {
  value: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

interface ThemedDropdownProps {
  label?: string;
  options: ThemedDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function ThemedDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  className = "",
}: ThemedDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block mb-1 text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
          disabled
            ? "bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 shadow-xs"
            : "bg-white hover:bg-slate-50/80 border-slate-200 text-slate-900 hover:border-slate-300 shadow-2xs"
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-900/10 py-1.5 focus:outline-none animate-in fade-in-50 zoom-in-95 duration-100">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-left transition-colors ${
                  option.disabled
                    ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400"
                    : isSelected
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{option.label}</span>
                  {option.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        option.disabled
                          ? "bg-slate-200 text-slate-600"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {option.badge}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
