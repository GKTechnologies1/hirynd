import React from "react";
import { Badge } from "@/components/ui/badge";
import { Award, Info, AlertCircle, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface VisaGradeBadgeProps {
  grade?: string | null;
  score?: number | null;
  visaMatched?: boolean;
  matchConfidence?: string | null;
  filingsCount?: number | null;
  showDetailsTooltip?: boolean;
  className?: string;
  size?: "sm" | "default";
}

export const VisaGradeBadge: React.FC<VisaGradeBadgeProps> = ({
  grade,
  score,
  visaMatched = true,
  matchConfidence,
  filingsCount,
  showDetailsTooltip = true,
  className = "",
  size = "default",
}) => {
  const isSmall = size === "sm";
  const badgeBase = `inline-flex items-center gap-1 font-medium select-none ${isSmall ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
    } ${className}`;

  // 1. Employer Not Matched in USCIS Database
  if (visaMatched === false || matchConfidence === "none") {
    const content = (
      <Badge
        variant="outline"
        className={`${badgeBase} bg-slate-100 text-slate-600 border-slate-300`}
      >
        <HelpCircle className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
        <span>No H1B Filings / Unrated</span>
      </Badge>
    );

    if (!showDetailsTooltip) return content;
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-semibold text-slate-900">Employer Not Matched</p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              This employer could not be confidently matched with historical USCIS H1B/LCA filings. Missing data is not proof that the employer does not sponsor visas.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 2. Employer Matched, but 0 filings found in relevant period
  if (filingsCount === 0 && (!grade || grade === "F")) {
    const content = (
      <Badge
        variant="outline"
        className={`${badgeBase} bg-slate-50 text-slate-500 border-slate-200`}
      >
        <Info className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
        <span>No H1B Filings (0)</span>
      </Badge>
    );

    if (!showDetailsTooltip) return content;
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-semibold text-slate-900">Zero Recent Filings</p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Verified employer record exists, but 0 H1B petitions were recorded in the latest USCIS dataset.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 3. Unrated (Matched but insufficient scoring points)
  if (!grade) {
    const content = (
      <Badge
        variant="outline"
        className={`${badgeBase} bg-slate-50 text-slate-500 border-slate-200`}
      >
        <AlertCircle className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
        <span>Unrated</span>
      </Badge>
    );

    if (!showDetailsTooltip) return content;
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-semibold text-slate-900">Unrated Opportunity</p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Insufficient historical data to assign an authoritative Visa Intelligence rating.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 4. Rated Employer: Grades A through F
  const g = grade.toUpperCase();
  let colorClass = "bg-slate-100 text-slate-700 border-slate-300";
  if (g === "A") colorClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
  else if (g === "B") colorClass = "bg-blue-100 text-blue-800 border-blue-300 font-semibold";
  else if (g === "C") colorClass = "bg-amber-100 text-amber-800 border-amber-300 font-medium";
  else if (g === "D") colorClass = "bg-orange-100 text-orange-800 border-orange-300";
  else if (g === "E" || g === "F") colorClass = "bg-red-100 text-red-800 border-red-300";

  const scoreDisplay = score !== undefined && score !== null && score > 0 ? ` (${score})` : "";

  const content = (
    <Badge variant="outline" className={`${colorClass} ${badgeBase}`}>
      <Award className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
      <span>
        Grade {g}
        {scoreDisplay}
      </span>
    </Badge>
  );

  if (!showDetailsTooltip) return content;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <p className="font-semibold text-slate-900">
            Visa Intelligence Grade {g} {score ? `• Score ${score}/100` : ""}
          </p>
          <p className="text-slate-600 text-[11px] mt-0.5">
            Derived from verified USCIS H1B filings, approval ratios, PERM Green Card sponsorship, and E-Verify status.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VisaGradeBadge;

