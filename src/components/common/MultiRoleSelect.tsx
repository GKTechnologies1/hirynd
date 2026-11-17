import React, { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiRoleSelectProps {
  roles: string[];
  selectedRoles: string[];
  onChange: (roles: string[]) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  badgeClassName?: string;
  popoverWidth?: string;
  disabled?: boolean;
}

export const MultiRoleSelect: React.FC<MultiRoleSelectProps> = ({
  roles = [],
  selectedRoles = [],
  onChange,
  placeholder = "All Roles",
  className,
  triggerClassName,
  badgeClassName,
  popoverWidth = "w-72",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Deduplicate and filter roles
  const filteredRoles = useMemo(() => {
    const term = search.trim().toLowerCase();
    const unique = Array.from(new Set(roles.filter(Boolean)));
    if (!term) return unique;
    return unique.filter((r) => r.toLowerCase().includes(term));
  }, [roles, search]);

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      onChange(selectedRoles.filter((r) => r !== role));
    } else {
      onChange([...selectedRoles, role]);
    }
  };

  const handleSelectAll = () => {
    const allFiltered = filteredRoles;
    const combined = Array.from(new Set([...selectedRoles, ...allFiltered]));
    onChange(combined);
  };

  const handleClearAll = () => {
    if (search.trim()) {
      // Clear only filtered
      onChange(selectedRoles.filter((r) => !filteredRoles.includes(r)));
    } else {
      onChange([]);
    }
  };

  const handleClearSelected = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            className={cn(
              "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors text-left",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-1 overflow-hidden mr-1 min-w-0">
              {selectedRoles.length === 0 ? (
                <span className="text-muted-foreground truncate">{placeholder}</span>
              ) : selectedRoles.length === 1 ? (
                <Badge
                  variant="secondary"
                  className={cn("text-[10px] font-medium py-0 px-1.5 truncate max-w-[170px]", badgeClassName)}
                  title={selectedRoles[0]}
                >
                  {selectedRoles[0]}
                </Badge>
              ) : (
                <div className="flex items-center gap-1 overflow-hidden">
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] font-medium py-0 px-1.5 truncate max-w-[120px]", badgeClassName)}
                    title={selectedRoles[0]}
                  >
                    {selectedRoles[0]}
                  </Badge>
                  <Badge
                    variant="default"
                    className="text-[9px] font-bold py-0 px-1.5 h-4 bg-primary text-primary-foreground shrink-0 rounded-full"
                  >
                    +{selectedRoles.length - 1}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
              {selectedRoles.length > 0 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClearSelected}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClearSelected(e as any); }}
                  className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  title="Clear role filter"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent className={cn("p-0 shadow-md border-border/60 z-50", popoverWidth)} align="start">
          {/* Search Box */}
          <div className="p-2 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 pr-7 h-7 text-xs bg-muted/30 focus:bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/20 border-b border-border/40 text-[11px]">
            <span className="text-muted-foreground font-medium">
              {selectedRoles.length} of {roles.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-primary hover:underline font-semibold cursor-pointer text-[10px]"
              >
                Select all
              </button>
              <span className="text-muted-foreground/40">•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer text-[10px]"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Roles Checkbox List */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-border/20 custom-scrollbar">
            {filteredRoles.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No roles match "{search}"
              </div>
            ) : (
              filteredRoles.map((role) => {
                const isSelected = selectedRoles.includes(role);
                return (
                  <label
                    key={role}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer select-none transition-colors",
                      isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRole(role)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate flex-1" title={role}>
                      {role}
                    </span>
                    {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                  </label>
                );
              })
            )}
          </div>

          {/* Footer with selected pills preview if any */}
          {selectedRoles.length > 0 && (
            <div className="p-2 border-t border-border/40 bg-muted/10 flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
              {selectedRoles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-foreground"
                >
                  <span className="truncate max-w-[120px]" title={r}>{r}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRole(r);
                    }}
                    className="hover:text-destructive cursor-pointer"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
