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
          formatted.includes("/");
        if (!hasPeriod) {
          if (cleanPeriod) {
            formatted = `${formatted} / ${cleanPeriod}`;
          } else {
            const numMatch = formatted.match(/\d[\d,]*/);
            if (numMatch) {
              const numVal = Number(numMatch[0].replace(/,/g, ""));
              if (numVal > 0 && numVal < 300) {
                formatted = `${formatted} / hourly`;
              } else if (numVal >= 10000) {
                formatted = `${formatted} / yearly`;
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
        const base = `$${minVal.toLocaleString()} - $${maxVal.toLocaleString()}`;
        return cleanPeriod ? `${base} / ${cleanPeriod}` : base;
      }
    }

    if (input.salary_min) {
      const minVal = Number(input.salary_min);
      if (!isNaN(minVal)) {
        const base = `$${minVal.toLocaleString()}+`;
        return cleanPeriod ? `${base} / ${cleanPeriod}` : base;
      }
    }

    return "Not Disclosed";
  }

  // If input is a primitive string or number
  return formatRawSalaryString(input);
};

const formatRawSalaryString = (rawSalary: any): string => {
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
  return `$${cleaned}`;
};

export default formatSalaryDisplay;

