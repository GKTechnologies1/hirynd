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
  if (s.includes("full")) return "Full-Time";
  if (s.includes("part")) return "Part-Time";
  if (s.includes("contract") || s.includes("c2c") || s.includes("corp")) return "Contract";
  if (s.includes("intern")) return "Internship";
  if (s.includes("third") || s.includes("vendor")) return "Third-Party (C2C)";
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

export default formatSalaryDisplay;
