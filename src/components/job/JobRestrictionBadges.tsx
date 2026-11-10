import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Lock, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface RestrictionItem {
  type: string; // US_CITIZENSHIP_REQUIRED, NO_TEMPORARY_VISA, SECRET_CLEARANCE
  label: string;
  matched_phrase?: string;
  evidence?: string;
  confidence?: string;
  version?: string;
}

export interface JobRestrictionBadgesProps {
  restrictions?: RestrictionItem[] | null;
  className?: string;
  compact?: boolean;
}

export const JobRestrictionBadges: React.FC<JobRestrictionBadgesProps> = ({
  restrictions,
  className = "",
  compact = true,
}) => {
  if (!restrictions || restrictions.length === 0) {
    return null;
  }

  const getStyleAndIcon = (type: string) => {
    switch (type) {
      case "US_CITIZENSHIP_REQUIRED":
        return {
          colorClass: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
          icon: <ShieldAlert className="h-2.5 w-2.5 text-rose-600 shrink-0" />,
          shortLabel: "US Citizen Only",
        };
      case "NO_TEMPORARY_VISA":
        return {
          colorClass: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
          icon: <AlertTriangle className="h-2.5 w-2.5 text-amber-600 shrink-0" />,
          shortLabel: "No Visa Sponsorship",
        };
      case "SECRET_CLEARANCE":
        return {
          colorClass: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
          icon: <Lock className="h-2.5 w-2.5 text-purple-600 shrink-0" />,
          shortLabel: "Secret Clearance",
        };
      default:
        return {
          colorClass: "bg-slate-100 text-slate-700 border-slate-300",
          icon: <ShieldAlert className="h-2.5 w-2.5 text-slate-600 shrink-0" />,
          shortLabel: "Restriction",
        };
    }
  };

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <TooltipProvider delayDuration={150}>
        {restrictions.map((res, idx) => {
          const { colorClass, icon, shortLabel } = getStyleAndIcon(res.type);
          const displayLabel = compact ? shortLabel : res.label;

          return (
            <Tooltip key={`${res.type}-${idx}`}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`${colorClass} px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 cursor-help transition-colors border`}
                >
                  {icon}
                  <span className="truncate max-w-[140px]">{displayLabel}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs p-2.5 space-y-1">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  {icon}
                  {res.label}
                </p>
                {res.evidence && (
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-[11px] text-slate-700 italic">
                    "{res.evidence}"
                  </div>
                )}
                {res.matched_phrase && (
                  <p className="text-[10px] text-slate-500">
                    Detected phrase: <span className="font-mono text-slate-700">"{res.matched_phrase}"</span>
                  </p>
                )}
                <p className="text-[9px] text-slate-400">
                  Automated informational indicator — subject to human review.
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
};

export default JobRestrictionBadges;

