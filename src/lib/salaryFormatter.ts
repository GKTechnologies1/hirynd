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
      const formatted = formatRawSalaryString(raw);
      if (
        formatted !== "Not Disclosed" &&
        cleanPeriod &&
        !formatted.toLowerCase().includes(cleanPeriod) &&
        !formatted.includes("/hr") &&
        !formatted.includes("/yr") &&
        !formatted.includes("/year") &&
        !formatted.includes("/hour")
      ) {
        return `${formatted} / ${cleanPeriod}`;
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

  // Strip all leading dollar signs, then add a single '$' unless another currency symbol is present
  const cleaned = s.replace(/^\$+/, "").trim();
  if (!cleaned) return "Not Disclosed";
  if (/^[€£₹]/.test(cleaned)) {
    return cleaned;
  }
  return `$${cleaned}`;
};

export default formatSalaryDisplay;

