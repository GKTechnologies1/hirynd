/**
 * Formats salary display for both raw salary values (string/number) and job objects
 * containing structured salary fields (salary_raw, salary_min, salary_max, salary_period).
 */
export const formatSalaryDisplay = (input: any): string => {
  if (!input) return "Not Disclosed";

  // If input is an object (e.g. a job record)
  if (typeof input === "object") {
    const raw = input.salary_raw || input.salary || input.salary_range || input.pay_range;
    const period = input.salary_period || input.salary_type || input.period;
    const cleanPeriod = period ? String(period).replace(/^_/, "").toLowerCase().trim() : null;

    if (
      raw &&
      String(raw).trim() &&
      String(raw).toLowerCase() !== "not disclosed" &&
      String(raw).toLowerCase() !== "null" &&
      String(raw).toLowerCase() !== "undefined"
    ) {
      let formatted = formatRawSalaryString(raw);
      if (formatted !== "Not Disclosed") {
        const hasPeriod =
          formatted.toLowerCase().includes("hour") ||
          formatted.toLowerCase().includes("yr") ||
          formatted.toLowerCase().includes("year") ||
          formatted.toLowerCase().includes("month") ||
          formatted.toLowerCase().includes("week") ||
          formatted.toLowerCase().includes("day") ||
          formatted.includes("/");
        if (!hasPeriod) {
          if (cleanPeriod) {
            formatted = `${formatted} / ${cleanPeriod.charAt(0).toUpperCase() + cleanPeriod.slice(1)}`;
          } else {
            const numMatch = formatted.match(/\d[\d,]*/);
            if (numMatch) {
              const numVal = Number(numMatch[0].replace(/,/g, ""));
              if (numVal > 0 && numVal < 300) {
                formatted = `${formatted} / Hourly`;
              } else if (numVal >= 10000) {
                formatted = `${formatted} / Yearly`;
              }
            }
          }
        }
      }
      return formatted;
    }

    if (input.salary_min && input.salary_max) {
      const minVal = Number(input.salary_min);
      const maxVal = Number(input.salary_max);
      if (!isNaN(minVal) && !isNaN(maxVal)) {
        const periodStr = cleanPeriod ? ` / ${cleanPeriod.charAt(0).toUpperCase() + cleanPeriod.slice(1)}` : (minVal < 300 ? " / Hourly" : " / Yearly");
        const base = minVal === maxVal ? `$${minVal.toLocaleString()}` : `$${minVal.toLocaleString()} – $${maxVal.toLocaleString()}`;
        return `${base}${periodStr}`;
      }
    }

    if (input.salary_min) {
      const minVal = Number(input.salary_min);
      if (!isNaN(minVal)) {
        const periodStr = cleanPeriod ? ` / ${cleanPeriod.charAt(0).toUpperCase() + cleanPeriod.slice(1)}` : (minVal < 300 ? " / Hourly" : " / Yearly");
        return `$${minVal.toLocaleString()}+${periodStr}`;
      }
    }

    return "Not Disclosed";
  }

  // If input is a primitive string or number
  return formatRawSalaryString(input);
};

export const formatRawSalaryString = (rawSalary: any): string => {
  if (!rawSalary) return "Not Disclosed";
  const s = String(rawSalary).trim();
  if (
    !s ||
    s === "-" ||
    s.toLowerCase() === "not disclosed" ||
    s.toLowerCase() === "null" ||
    s.toLowerCase() === "undefined" ||
    s.toLowerCase() === "n/a"
  ) {
    return "Not Disclosed";
  }

  // Strip all leading dollar signs and whitespace (e.g. "$ $", "$  $"), then add a single '$'
  const cleaned = s.replace(/^[\$\s]+/, "").trim();
  if (!cleaned) return "Not Disclosed";
  if (/^[€£₹]/.test(cleaned)) {
    return cleaned;
  }
  let formatted = `$${cleaned}`;

  // Check if period is already in formatted string
  const hasPeriod =
    formatted.toLowerCase().includes("hour") ||
    formatted.toLowerCase().includes("yr") ||
    formatted.toLowerCase().includes("year") ||
    formatted.toLowerCase().includes("month") ||
    formatted.toLowerCase().includes("week") ||
    formatted.toLowerCase().includes("day") ||
    formatted.includes("/");
  if (!hasPeriod) {
    const numMatch = formatted.match(/\d[\d,]*/);
    if (numMatch) {
      const numVal = Number(numMatch[0].replace(/,/g, ""));
      if (numVal > 0 && numVal < 300) {
        formatted = `${formatted} / Hourly`;
      } else if (numVal >= 10000) {
        formatted = `${formatted} / Yearly`;
      }
    }
  }

  return formatted;
};

/**
 * Normalizes employment type strings (e.g. 'contract', 'fulltime', 'full-time') into clean Title Case labels.
 */
export const formatEmploymentType = (val?: string): string => {
  if (!val) return "Full-Time";
  const s = val.toLowerCase().replace(/[-_\s]+/g, " ").trim();
  if (s === "remote") return "Full-Time";
  // If application has both Full Time and Hybrid/Hyrind, return only Hybrid/Hyrind
  if (s.includes("hyrind")) return "Hyrind";
  if (s.includes("hybrid")) return "Hybrid";
  if (s.includes("contract") || s.includes("c2c") || s.includes("corp")) return "Contract";
  if (s.includes("part")) return "Part-Time";
  if (s.includes("intern")) return "Internship";
  if (s.includes("third") || s.includes("vendor")) return "Third-Party (C2C)";
  if (s.includes("full")) return "Full-Time";
  return val.charAt(0).toUpperCase() + val.slice(1);
};

/**
 * Normalizes work mode strings (e.g. 'remote', 'hybrid', 'onsite') into standard Title Case.
 */
export const formatWorkMode = (val?: string): string => {
  if (!val) return "Onsite";
  const s = val.toLowerCase().trim();
  if (s === "remote") return "Remote";
  if (s === "hybrid") return "Hybrid";
  if (s === "onsite" || s === "on-site") return "Onsite";
  return val.charAt(0).toUpperCase() + val.slice(1);
};

/**
 * Cleanly formats numeric experience values (e.g. "10.0" -> "10", "2.0" -> "2", "2.5" -> "2.5").
 */
export const formatExpNumber = (val: any): string => {
  if (val == null || val === "") return "";
  const num = Number(val);
  if (!isNaN(num)) {
    return Number.isInteger(num) ? num.toString() : num.toString();
  }
  return String(val).replace(/\.0$/, "");
};

/**
 * Formats experience display from min_years, max_years and fallback level.
 */
export const formatExperienceBadge = (
  minYears: any,
  maxYears: any,
  fallbackLevel?: string | null,
  unit: "yrs" | "years" = "yrs"
): string | null => {
  if (minYears != null && minYears !== "") {
    const minStr = formatExpNumber(minYears);
    if (maxYears != null && maxYears !== "") {
      const maxStr = formatExpNumber(maxYears);
      return `${minStr}–${maxStr} ${unit}`;
    }
    return `${minStr}+ ${unit}`;
  }
  if (fallbackLevel && String(fallbackLevel).trim()) {
    return fallbackLevel;
  }
  return null;
};

/**
 * Normalizes visa eligibility / details:
 * - If H1B filings: returns "H1B"
 * - If no filings: returns "No filings history"
 */
export const formatVisaDetails = (val?: any, filingsCount?: number | null, isSponsor?: boolean | null): string => {
  if (filingsCount !== undefined && filingsCount !== null) {
    return Number(filingsCount) > 0 ? "H1B" : "No filings history";
  }
  if (isSponsor !== undefined && isSponsor !== null) {
    return isSponsor ? "H1B" : "No filings history";
  }
  if (!val) return "No filings history";

  const s = String(val).trim();
  const low = s.toLowerCase();

  if (low === "h1b" || low.includes("h-1b") || low.includes("h1-b")) {
    return "H1B";
  }
  if (
    low.includes("all work") ||
    low.includes("no filing") ||
    low.includes("unrated") ||
    low === "none" ||
    low === "null" ||
    low === "—" ||
    low === "-" ||
    low === "0"
  ) {
    return "No filings history";
  }
  if (/grade\s*[eef]/i.test(low)) {
    return "No filings history";
  }
  if (/grade\s*[abcd]/i.test(low)) {
    return "H1B";
  }
  if (low.includes("opt") || low.includes("stem") || low.includes("usc") || low.includes("green card")) {
    return s;
  }
  return "H1B";
};

export default formatSalaryDisplay;
