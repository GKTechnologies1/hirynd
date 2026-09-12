import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SuggestInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "onSelect"> {
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (value: string) => void;
  suggestions: string[];
  recommendedBadge?: string;
  className?: string;
  hasError?: boolean;
}

export const SuggestInput: React.FC<SuggestInputProps> = ({
  value,
  onChange,
  onSelectOption,
  suggestions,
  recommendedBadge,
  className,
  hasError,
  placeholder,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const datalistId = useRef(`suggest-list-${Math.random().toString(36).substring(2, 9)}`).current;

  // Filter suggestions based on input value
  const filtered = React.useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    if (!value || !value.trim()) {
      return suggestions.slice(0, 15);
    }
    const q = value.toLowerCase().trim();
    return suggestions
      .filter((item) => item.toLowerCase().includes(q))
      .slice(0, 15);
  }, [suggestions, value]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    if (onSelectOption) {
      onSelectOption(option);
    }
    setIsOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filtered.length === 0) {
      if (e.key === "ArrowDown" && filtered.length > 0) {
        setIsOpen(true);
        setHighlightIdx(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter" && highlightIdx >= 0 && highlightIdx < filtered.length) {
      e.preventDefault();
      handleSelect(filtered[highlightIdx]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIdx(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        list={datalistId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightIdx(-1);
        }}
        onFocus={() => {
          if (filtered.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(className, hasError && "border-destructive focus-visible:ring-destructive")}
        autoComplete="off"
        {...props}
      />

      <datalist id={datalistId}>
        {suggestions.slice(0, 30).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {isOpen && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 custom-scrollbar text-left"
        >
          {filtered.map((item, idx) => {
            const isSelected = item.toLowerCase() === value.toLowerCase().trim();
            const isHighlighted = idx === highlightIdx;
            const isRecommended =
              recommendedBadge &&
              item.toLowerCase() === recommendedBadge.toLowerCase();

            return (
              <div
                key={item}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(item);
                }}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors select-none",
                  isHighlighted || isSelected
                    ? "bg-blue-50 text-blue-900 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className="truncate">{item}</span>
                {isRecommended && (
                  <span className="text-[9px] font-bold tracking-tight text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full ml-1 shrink-0">
                    Recommended
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuggestInput;
