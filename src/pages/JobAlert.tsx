import React, { useState, useEffect, useMemo, useCallback } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { recruitersApi } from "@/services/api";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/DatePicker";
import LocationFilterPopover from "@/components/jobs/LocationFilterPopover";
import {
  Search, Globe, X, ExternalLink, Calendar, LayoutGrid, Table, Share2, MapPin,
  Briefcase, DollarSign, Clock, UserCheck, MoreHorizontal, Home, Award, Ban, Heart,
  Sparkles, Lock, Filter, ChevronDown, Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

const JobDescriptionCell = ({
  company,
  role,
  description,
  job,
  onReadMore
}: {
  company: string;
  role: string;
  description?: string;
  job?: any;
  onReadMore: (jobOrCompany: any, role?: string, desc?: string) => void;
}) => {
  if (!description) return <span className="text-slate-400">—</span>;

  const isLengthy = description.length > 100;
  if (!isLengthy) {
    return <span className="text-xs whitespace-pre-wrap">{description}</span>;
  }

  const preview = description.slice(0, 100) + "...";
  return (
    <div className="text-xs text-center">
      <span>{preview}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReadMore(job || { company_name: company, role_title: role, job_description: description });
        }}
        className="text-primary hover:underline font-semibold ml-1 cursor-pointer block mt-1 mx-auto"
      >
        Read More
      </button>
    </div>
  );
};

const formatSalaryDisplay = (rawSalary: any): string => {
  if (!rawSalary) return "Not Disclosed";
  const s = String(rawSalary).trim();
  if (!s || s === "-" || s.toLowerCase() === "not disclosed" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return "Not Disclosed";
  }
  // Strip all leading dollar signs, then add a single '$'
  const cleaned = s.replace(/^\$+/, '').trim();
  if (!cleaned) return "Not Disclosed";
  if (/^[€£₹]/.test(cleaned)) {
    return cleaned;
  }
  return `$${cleaned}`;
};

const JobCardItem = ({
  job,
  onReadMore,
  onSocialShare,
}: {
  job: any;
  onReadMore: (jobOrCompany: any, role?: string, desc?: string) => void;
  onSocialShare: (platform: string, job: any) => void;
}) => {
  const companyName = job.company_name || job.company || "Company";
  const roleTitle = job.role_title || job.title || job.role || "Job Opening";
  const tagline = job.company_tagline || job.industry || "Job Opening";

  const locationParts = [job.city, job.state, job.country].filter(Boolean).join(", ");
  const location = locationParts || job.location || "-";
  const workType = job.work_mode || job.work_type || job.remote_type || "-";
  const employmentType = job.employment_type || job.job_type || "-";
  const expLevel = job.experience_required || job.experience_level || job.level || "-";
  const salary = formatSalaryDisplay(job.salary || job.salary_range || job.pay_range);
  const visaEligibility = job.visa_eligibility || null;
  const applicantsCount = job.applicants_count || "-";

  const postedDate = formatDate(job.log_date || job.created_at);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 md:p-4 shadow-2xs hover:shadow-md transition-all duration-300 space-y-2.5 group">
      {/* Top Header Row */}
      <div className="flex items-start gap-3">
        {/* Company Logo Container */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white flex items-center justify-center font-extrabold text-lg shadow-2xs shrink-0 mt-0.5">
          {companyName.charAt(0).toUpperCase()}
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0">
          {/* Badge Row */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            <span className="bg-blue-50 text-blue-800 border border-blue-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-600" />
              {postedDate}
            </span>
            {visaEligibility && (
              <span className="bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-md">
                Visa: {visaEligibility}
              </span>
            )}
            <span className="bg-indigo-50 text-indigo-800 border border-indigo-200/60 px-2 py-0.5 rounded-md">
              Verified Opening
            </span>
          </div>

          {/* Job Title */}
          <h3
            onClick={() => onReadMore(job)}
            className="text-base md:text-lg font-extrabold text-slate-900 hover:text-primary transition-colors cursor-pointer mt-1 leading-snug truncate"
          >
            {roleTitle}
          </h3>

          {/* Company Name */}
          <p className="text-xs text-slate-500 font-medium truncate">
            <span className="font-bold text-slate-700">{companyName}</span>
          </p>
        </div>

        {/* Far Right Action Menu */}
        <div className="flex items-center gap-0.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Share job"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
              <DropdownMenuItem onClick={() => onSocialShare("copy", job)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                📋 Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("linkedin", job)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                💼 LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("whatsapp", job)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                💬 WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("facebook", job)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                👥 Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("x", job)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                𝕏 Share on X
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("email", job)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                ✉️ Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => onReadMore(job)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="More options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Middle Grid Row - 3 Columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5 text-xs text-slate-600 font-medium border-t border-slate-100">
        {/* Column 1 */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Home className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800 truncate">{workType}</span>
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 truncate">
            <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{employmentType}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{expLevel}</span>
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 truncate">
            <DollarSign className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="font-bold text-blue-700 truncate">{salary}</span>
          </div>
          {visaEligibility && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold truncate">
              <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="truncate">{visaEligibility}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Row */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Left Applicant Info */}
        <span className="text-[11px] text-slate-400 font-medium">
          {applicantsCount}
        </span>

        {/* Right Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Read Details */}
          <button
            onClick={() => onReadMore(job)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80 rounded-full text-xs font-bold tracking-wide transition-all flex items-center gap-1 cursor-pointer"
          >
            Read Details
          </button>

          {/* Direct Apply Button */}
          {job.job_url ? (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 bg-gradient-to-r from-[#0d47a1] to-[#1565c0] hover:from-[#1565c0] hover:to-[#1e40af] text-white font-extrabold rounded-full text-xs uppercase tracking-wider transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              APPLY NOW
              <ExternalLink className="h-3 w-3 ml-0.5" />
            </a>
          ) : (
            <button
              onClick={() => onReadMore(job)}
              className="px-4 py-1.5 bg-gradient-to-r from-[#0d47a1] to-[#1565c0] hover:from-[#1565c0] hover:to-[#1e40af] text-white font-extrabold rounded-full text-xs uppercase tracking-wider transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              AUTOFILL APPLY
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface MultiSelectFilterPopoverProps {
  label: string;
  categoryTitle?: string;
  icon?: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  activeColorClass?: string;
}

const MultiSelectFilterPopover: React.FC<MultiSelectFilterPopoverProps> = ({
  label,
  categoryTitle,
  icon,
  options,
  selected,
  onChange,
  isLoading = false,
  searchPlaceholder = "Enter keyword to search...",
  activeColorClass = "bg-blue-50 text-[#0d47a1] border-blue-200 font-extrabold shadow-2xs",
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRenderLoading, setIsRenderLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIsRenderLoading(true);
      const timer = setTimeout(() => setIsRenderLoading(false), 80);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const showSkeleton = isLoading || isRenderLoading;

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchTerm]);

  const handleToggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleReset = () => {
    onChange([]);
    setSearchTerm("");
  };

  const isSelected = selected.length > 0;
  const displayLabel = useMemo(() => {
    if (selected.length === 0) return label;
    if (selected.length === 1) return selected[0];
    return `${selected[0]} (+${selected.length - 1})`;
  }, [selected, label]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs ${isSelected
            ? activeColorClass
            : "bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 border-slate-200 font-medium"
            }`}
        >
          {icon}
          <span>{displayLabel}</span>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="w-[420px] max-w-[90vw] p-4 rounded-2xl bg-white shadow-xl border border-slate-200/90 space-y-3 z-50">
        {/* Category Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1">
            <span className="text-rose-500 font-bold">*</span>
            <span>{categoryTitle || label}</span>
          </h4>
          {selected.length > 0 && (
            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {selected.length} selected
            </span>
          )}
        </div>

        {/* Selected Tags Container (4-column grid layout) */}
        {selected.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 p-1.5 max-h-36 overflow-y-auto custom-scrollbar bg-slate-50/70 rounded-xl border border-slate-100">
            {selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center justify-between gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-100/90 text-blue-900 border border-blue-200/80 hover:bg-blue-200/80 transition-colors shadow-2xs min-w-0"
              >
                <span className="truncate">{item}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(item);
                  }}
                  className="hover:text-rose-600 font-bold p-0.5 rounded-full hover:bg-blue-200/60 transition-colors cursor-pointer shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Small Search Option Input inside Dropdown */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable Options List */}
        <div className="max-h-52 overflow-y-auto space-y-1 my-1 pr-1 custom-scrollbar">
          {showSkeleton ? (
            <div className="space-y-1.5 py-1">
              <Skeleton className="h-7 w-full rounded-xl" />
              <Skeleton className="h-7 w-full rounded-xl" />
              <Skeleton className="h-7 w-full rounded-xl" />
              <Skeleton className="h-7 w-full rounded-xl" />
              <Skeleton className="h-7 w-full rounded-xl" />
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 font-medium">
              No options match "{searchTerm}"
            </div>
          ) : (
            filteredOptions.map((option) => {
              const checked = selected.includes(option);
              return (
                <div
                  key={option}
                  onClick={() => handleToggle(option)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${checked
                    ? "bg-blue-50/80 text-blue-950 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${checked
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                        }`}
                    >
                      {checked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate">{option}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons: Reset & Confirm */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={selected.length === 0 && !searchTerm}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors px-1 py-0.5"
          >
            Reset
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function JobAlert() {
  const { toast } = useToast();
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJobDesc, setActiveJobDesc] = useState<{
    company: string;
    role: string;
    description: string;
    employment_type?: string;
    experience_required?: string;
    work_mode?: string;
    location?: string;
    salary?: string;
    visa_eligibility?: string;
    skills?: string;
    job_url?: string;
    posting_date?: string;
    rawJob?: any;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [searchSkills, setSearchSkills] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalUnfilteredJobs, setTotalUnfilteredJobs] = useState(0);

  // Backend Filter Options
  const [filterOptions, setFilterOptions] = useState<{
    roles: string[];
    locations: any;
    employment_types: string[];
    work_modes: string[];
    experience_levels: string[];
    visa_eligibilities: string[];
    total_count?: number;
  }>({
    roles: [],
    locations: [],
    employment_types: [],
    work_modes: [],
    experience_levels: [],
    visa_eligibilities: [],
  });

  // Multi-Select Filter states
  const [filterLocation, setFilterLocation] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string[]>([]);
  const [filterWorkMode, setFilterWorkMode] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterExp, setFilterExp] = useState<string[]>([]);
  const [filterVisa, setFilterVisa] = useState<string[]>([]);
  const [filterSalary, setFilterSalary] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("Newest First");

  // Debounced search queries for smooth typing
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState(searchTitle);
  const [debouncedSearchCompany, setDebouncedSearchCompany] = useState(searchCompany);
  const [debouncedSearchSkills, setDebouncedSearchSkills] = useState(searchSkills);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTitle(searchTitle), 300);
    return () => clearTimeout(timer);
  }, [searchTitle]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchCompany(searchCompany), 300);
    return () => clearTimeout(timer);
  }, [searchCompany]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchSkills(searchSkills), 300);
    return () => clearTimeout(timer);
  }, [searchSkills]);

  // Load distinct filter options from backend
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const res = await recruitersApi.getJobAlertFilterOptions();
        if (res.data) {
          setFilterOptions(res.data);
          if (typeof res.data.total_count === "number") {
            setTotalUnfilteredJobs(res.data.total_count);
          }
        }
      } catch (err) {
        console.error("Failed to load filter options:", err);
      }
    };
    loadFilterOptions();
  }, []);

  // Distinct locations from backend or fallback defaults
  const dynamicLocations = useMemo(() => {
    if (filterOptions.locations && filterOptions.locations.length > 0) {
      return filterOptions.locations;
    }
    return ["United States", "Canada", "United Kingdom", "Remote", "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Los Angeles, CA", "Chicago, IL", "Boston, MA", "Atlanta, GA"];
  }, [filterOptions.locations]);

  // Distinct roles from backend or fallback defaults
  const dynamicRoles = useMemo(() => {
    if (filterOptions.roles && filterOptions.roles.length > 0) {
      return filterOptions.roles;
    }
    return ["Python Engineer", "Software Engineer", "Frontend Engineer", "Backend Developer", "Full Stack Developer", "Data Scientist", "DevOps Engineer", "Product Manager", "AI / ML Engineer", "QA Engineer"];
  }, [filterOptions.roles]);

  const dynamicEmploymentTypes = useMemo(() => {
    if (filterOptions.employment_types && filterOptions.employment_types.length > 0) {
      return filterOptions.employment_types;
    }
    return ["Full-time", "Part-time", "Contract", "Contract-to-Hire", "Internship", "W2", "C2C"];
  }, [filterOptions.employment_types]);

  const dynamicWorkModes = useMemo(() => {
    if (filterOptions.work_modes && filterOptions.work_modes.length > 0) {
      return filterOptions.work_modes;
    }
    return ["Onsite", "Hybrid", "Remote"];
  }, [filterOptions.work_modes]);

  const dynamicExperienceLevels = useMemo(() => {
    if (filterOptions.experience_levels && filterOptions.experience_levels.length > 0) {
      return filterOptions.experience_levels;
    }
    return ["Intern/New Grad", "0–2 Years", "2–5 Years", "5+ Years", "Senior Level", "Lead / Staff"];
  }, [filterOptions.experience_levels]);

  const dynamicVisaEligibilities = useMemo(() => {
    if (filterOptions.visa_eligibilities && filterOptions.visa_eligibilities.length > 0) {
      return filterOptions.visa_eligibilities;
    }
    return ["OPT", "STEM OPT", "H1B", "H1B Transfer", "USC", "Green Card", "All Work Authorization"];
  }, [filterOptions.visa_eligibilities]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.paddingTop = '58px';
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  // Fetch alerts from backend with pagination and filters
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        page_size: pageSize,
      };

      if (debouncedSearchQuery.trim()) params.search = debouncedSearchQuery.trim();
      if (debouncedSearchTitle.trim()) params.title = debouncedSearchTitle.trim();
      if (debouncedSearchCompany.trim()) params.company = debouncedSearchCompany.trim();
      if (debouncedSearchSkills.trim()) params.skills = debouncedSearchSkills.trim();
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (filterLocation.length > 0) params.location = filterLocation.join(",");
      if (filterRole.length > 0) params.role = filterRole.join(",");
      if (filterWorkMode.length > 0) params.work_mode = filterWorkMode.join(",");
      if (filterType.length > 0) params.employment_type = filterType.join(",");
      if (filterExp.length > 0) params.experience_required = filterExp.join(",");
      if (filterVisa.length > 0) params.visa_eligibility = filterVisa.join(",");
      if (filterSalary.length > 0) params.salary = filterSalary.join(",");
      if (filterDate.length > 0) params.date_preset = filterDate.join(",");
      if (sortOrder === "Oldest First") params.ordering = "created_at";

      const res = await recruitersApi.getPublicJobAlerts(params);
      if (Array.isArray(res.data)) {
        setJobPostings(res.data);
        setTotalJobs(res.data.length);
      } else if (res.data && Array.isArray(res.data.results)) {
        setJobPostings(res.data.results);
        setTotalJobs(typeof res.data.total === "number" ? res.data.total : res.data.results.length);
        if (typeof res.data.unfiltered_total === "number") {
          setTotalUnfilteredJobs(res.data.unfiltered_total);
        }
      } else {
        setJobPostings([]);
        setTotalJobs(0);
      }
    } catch (err: any) {
      console.error("Error fetching job openings:", err);
      toast({
        title: "Error loading job openings",
        description: "Could not fetch job openings. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    currentPage, pageSize, debouncedSearchQuery, debouncedSearchTitle, debouncedSearchCompany,
    debouncedSearchSkills, fromDate, toDate, filterLocation, filterRole, filterWorkMode,
    filterType, filterExp, filterVisa, filterSalary, filterDate, sortOrder, toast
  ]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchQuery, debouncedSearchTitle, debouncedSearchCompany, debouncedSearchSkills,
    fromDate, toDate, filterLocation, filterRole, filterWorkMode, filterType,
    filterExp, filterVisa, filterSalary, filterDate, sortOrder, pageSize
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (searchTitle.trim()) count++;
    if (searchCompany.trim()) count++;
    if (searchSkills.trim()) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (filterLocation.length > 0) count += filterLocation.length;
    if (filterRole.length > 0) count += filterRole.length;
    if (filterWorkMode.length > 0) count += filterWorkMode.length;
    if (filterType.length > 0) count += filterType.length;
    if (filterExp.length > 0) count += filterExp.length;
    if (filterVisa.length > 0) count += filterVisa.length;
    if (filterSalary.length > 0) count += filterSalary.length;
    if (filterDate.length > 0) count += filterDate.length;
    return count;
  }, [
    searchQuery, searchTitle, searchCompany, searchSkills, fromDate, toDate,
    filterLocation, filterRole, filterWorkMode, filterType,
    filterExp, filterVisa, filterSalary, filterDate
  ]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSearchTitle("");
    setSearchCompany("");
    setSearchSkills("");
    setFromDate("");
    setToDate("");
    setFilterLocation([]);
    setFilterRole([]);
    setFilterWorkMode([]);
    setFilterType([]);
    setFilterExp([]);
    setFilterVisa([]);
    setFilterSalary([]);
    setFilterDate([]);
    setSortOrder("Newest First");
    setCurrentPage(1);
    toast({ title: "Filters Reset", description: "All search and date filters have been cleared." });
  };

  const totalPages = Math.max(1, Math.ceil(totalJobs / pageSize));
  const paginatedJobs = jobPostings;

  const handleOpenDescription = (jobOrCompany: any, role?: string, description?: string) => {
    if (typeof jobOrCompany === "string") {
      setActiveJobDesc({
        company: jobOrCompany,
        role: role || "",
        description: description || "",
        salary: "Not Disclosed",
        rawJob: { company_name: jobOrCompany, role_title: role, job_description: description }
      });
    } else {
      const j = jobOrCompany;
      const locationParts = [j.city, j.state, j.country].filter(Boolean).join(", ");
      const skillsStr = Array.isArray(j.skills) ? j.skills.join(", ") : (j.skills || "");
      const postedDateStr = formatDate(j.log_date || j.created_at);
      setActiveJobDesc({
        company: j.company_name || j.company || "",
        role: j.role_title || j.title || j.role || "",
        description: j.job_description || "",
        employment_type: j.employment_type || j.job_type,
        experience_required: j.experience_required || j.experience_level,
        work_mode: j.work_mode || j.work_type || j.remote_type,
        location: locationParts || j.location,
        salary: formatSalaryDisplay(j.salary || j.salary_range || j.pay_range),
        visa_eligibility: j.visa_eligibility,
        skills: skillsStr,
        job_url: j.job_url,
        posting_date: postedDateStr,
        rawJob: j,
      });
    }
  };

  const handleSocialShare = (platform: string, job: any) => {
    if (!job) return;
    const company = job.company_name || job.company || "Company";
    const role = job.role_title || job.title || job.role || "Job Opening";
    const url = job.job_url || window.location.href;
    const text = `Check out this opening for ${role} at ${company}!`;

    switch (platform) {
      case "copy":
        navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: `Job link copied to clipboard.` });
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
        break;
      case "whatsapp":
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
        break;
      case "twitter":
      case "x":
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
        break;
      case "email":
        window.open(`mailto:?subject=${encodeURIComponent(`${role} at ${company}`)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`, "_blank");
        break;
      default:
        if (navigator.share && job.job_url) {
          navigator.share({ title: `${role} at ${company}`, text, url }).catch(() => { });
        } else {
          navigator.clipboard.writeText(url);
          toast({ title: "Link Copied!", description: `Job link copied to clipboard.` });
        }
        break;
    }
  };

  return (
    <div className="job-alerts-page min-h-screen flex flex-col">
      <SEO
        title="Job Board | HYRIND"
        description="Discover recruiter-verified job opportunities updated every day."
        path="/job-alert"
      />
      <Header />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        .job-alerts-page {
          background-color: #fcfdfe;
          color: #1e293b;
          font-family: 'Outfit', sans-serif;
          overflow-x: hidden;
        }

        .hero-section {
          background: radial-gradient(circle at top right, #1e40af, #0d47a1);
          color: white;
          padding: 60px 20px 20px;
          text-align: center;
          clip-path: ellipse(150% 100% at 50% 0%);
          position: relative;
          overflow: hidden;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: url('https://www.transparenttextures.com/patterns/cubes.png');
          opacity: 0.1;
          pointer-events: none;
        }

        .hero-content {
          max-width: 900px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .hero-title {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 800;
          margin-bottom: 8px;
          letter-spacing: -0.04em;
          line-height: 1.1;
        }

        .hero-subtitle {
          font-size: 1rem;
          opacity: 0.9;
          font-weight: 300;
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.5;
        }

        .job-alerts-main {
          padding: 20px 16px;
          background-color: #f8fafc;
          flex-grow: 1;
        }

        .job-alerts-container {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
        }

        .filter-card {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          border: 1px solid #e2e8f0;
          background-color: white;
          border-radius: 16px;
        }

        .table-card {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          border: 1px solid #e2e8f0;
          background-color: white;
          border-radius: 16px;
          overflow: hidden;
        }

        .apply-btn {
          background: linear-gradient(135deg, #0d47a1 0%, #1565c0 100%);
          color: white;
          border: none;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 10px rgba(13, 71, 161, 0.2);
        }

        .apply-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(13, 71, 161, 0.3);
          background: linear-gradient(135deg, #1565c0 0%, #1e40af 100%);
        }
      `}</style>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Live Job Board</h1>
          <p className="hero-subtitle">
            Discover recruiter-verified job opportunities updated every day.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="job-alerts-main">
        <div className="job-alerts-container space-y-3.5">
          {/* Single Unified Search & Filter Panel */}
          {/* Search & Filter Panel */}
          <Card className="filter-card border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-3.5 md:p-4 space-y-3">
              {/* Top Search Inputs Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Global Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search Keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-7 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Job Title Search */}
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Job Title..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="pl-9 pr-7 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                  />
                  {searchTitle && (
                    <button onClick={() => setSearchTitle("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Company Search */}
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Company..."
                    value={searchCompany}
                    onChange={(e) => setSearchCompany(e.target.value)}
                    className="pl-9 pr-7 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                  />
                  {searchCompany && (
                    <button onClick={() => setSearchCompany("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Skills Search */}
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Skills (React, Python)..."
                    value={searchSkills}
                    onChange={(e) => setSearchSkills(e.target.value)}
                    className="pl-9 pr-7 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                  />
                  {searchSkills && (
                    <button onClick={() => setSearchSkills("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* From Date Filter */}
                <div>
                  <DatePicker
                    value={fromDate}
                    onChange={(d) => setFromDate(d)}
                    placeholder="From Date"
                    formatStr="yyyy-MM-dd"
                    className="h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white font-normal"
                  />
                </div>

                {/* To Date Filter */}
                <div>
                  <DatePicker
                    value={toDate}
                    onChange={(d) => setToDate(d)}
                    placeholder="To Date"
                    formatStr="yyyy-MM-dd"
                    className="h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white font-normal"
                  />
                </div>
              </div>

              {/* Filter Pills Bar BELOW Search Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-slate-700">
                {/* 1. Location Multi-Select Dropdown */}
                <LocationFilterPopover
                  label="Location"
                  options={filterOptions.locations}
                  selected={filterLocation}
                  onChange={setFilterLocation}
                  isLoading={loading}
                />

                {/* 2. Job Title Multi-Select Dropdown */}
                <MultiSelectFilterPopover
                  label="Job Title"
                  categoryTitle="Role / Job Title"
                  icon={<Briefcase className="h-3 w-3 text-[#0d47a1]" />}
                  options={dynamicRoles}
                  selected={filterRole}
                  onChange={setFilterRole}
                  isLoading={loading}
                  searchPlaceholder="Search role title..."
                />

                {/* 3. Experience Multi-Select Dropdown */}
                <MultiSelectFilterPopover
                  label="Experience"
                  categoryTitle="Experience Required"
                  icon={<Award className="h-3 w-3 text-[#0d47a1]" />}
                  options={dynamicExperienceLevels}
                  selected={filterExp}
                  onChange={setFilterExp}
                  searchPlaceholder="Search experience..."
                />

                {/* 4. Employment Type Multi-Select Dropdown */}
                <MultiSelectFilterPopover
                  label="Employment Type"
                  categoryTitle="Employment Type"
                  icon={<Briefcase className="h-3 w-3 text-[#0d47a1]" />}
                  options={dynamicEmploymentTypes}
                  selected={filterType}
                  onChange={setFilterType}
                  searchPlaceholder="Search type..."
                />

                {/* 5. Work Mode Multi-Select Dropdown */}
                <MultiSelectFilterPopover
                  label="Work Mode"
                  categoryTitle="Work Mode"
                  icon={<Home className="h-3 w-3 text-[#0d47a1]" />}
                  options={dynamicWorkModes}
                  selected={filterWorkMode}
                  onChange={setFilterWorkMode}
                  searchPlaceholder="Search work mode..."
                />

                {/* 6. Visa Type Multi-Select Dropdown */}
                <MultiSelectFilterPopover
                  label="Visa Type"
                  categoryTitle="Visa Eligibility"
                  icon={<Sparkles className="h-3 w-3 text-[#0d47a1]" />}
                  options={dynamicVisaEligibilities}
                  selected={filterVisa}
                  onChange={setFilterVisa}
                  searchPlaceholder="Search visa..."
                />

                {/* 7. Salary Multi-Select Dropdown */}
                <MultiSelectFilterPopover
                  label="Salary"
                  categoryTitle="Salary Range"
                  icon={<DollarSign className="h-3 w-3 text-[#0d47a1]" />}
                  options={["Disclosed Only", "$50,000+", "$100,000+", "$150,000+", "$200,000+"]}
                  selected={filterSalary}
                  onChange={setFilterSalary}
                  searchPlaceholder="Search salary..."
                />

                {/* 8. Date Posted Multi-Select Dropdown */}
                <MultiSelectFilterPopover
                  label="Date Posted"
                  categoryTitle="Timeframe"
                  icon={<Clock className="h-3 w-3 text-[#0d47a1]" />}
                  options={["Posted Today", "Past 3 Days", "Past Week", "Past Month"]}
                  selected={filterDate}
                  onChange={setFilterDate}
                  searchPlaceholder="Search timeframe..."
                />

                {/* 10. Sort Order Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold bg-white text-slate-800 border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs">
                      <Filter className="h-3 w-3 text-slate-500" />
                      <span>{sortOrder === "Newest First" ? "Recommended" : sortOrder}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
                    {["Newest First", "Oldest First"].map((so) => (
                      <DropdownMenuItem
                        key={so}
                        onClick={() => setSortOrder(so)}
                        className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {so === "Newest First" ? "Recommended" : so}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 11. Reset Filters Button */}
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#0d47a1] hover:bg-[#1565c0] text-white font-bold transition-all whitespace-nowrap cursor-pointer text-xs shadow-xs"
                >
                  <X className="h-3 w-3" />
                  All Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Job Listings Panel */}
          <Card className="table-card border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-4 py-2.5 md:px-5 md:py-3 flex flex-row items-center justify-between gap-3 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold text-slate-800">
                <Globe className="h-4.5 w-4.5 text-primary" />
                All Available Job Openings ({activeFiltersCount > 0 ? `${totalJobs} of ${totalUnfilteredJobs}` : (totalUnfilteredJobs || totalJobs)})
              </CardTitle>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-200/70 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "cards"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "table"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <Table className="h-3.5 w-3.5" />
                  Table
                </button>
              </div>
            </CardHeader>

            <CardContent className={viewMode === "cards" ? "p-3.5 md:p-4" : "p-0"}>
              {viewMode === "cards" ? (
                loading ? (
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-3.5 md:p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <Skeleton className="h-4 w-20 rounded-md" />
                              <Skeleton className="h-4 w-24 rounded-md" />
                            </div>
                            <Skeleton className="h-5 w-2/3 rounded-md" />
                            <Skeleton className="h-3.5 w-1/3 rounded-md" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                          <Skeleton className="h-4 w-full rounded-md" />
                          <Skeleton className="h-4 w-full rounded-md" />
                          <Skeleton className="h-4 w-full rounded-md" />
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <Skeleton className="h-3.5 w-24 rounded-md" />
                          <div className="flex gap-2">
                            <Skeleton className="h-7 w-20 rounded-full" />
                            <Skeleton className="h-7 w-28 rounded-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : jobPostings.length === 0 ? (
                  /* Empty Search State */
                  <div className="text-center py-12 space-y-4">
                    <Search className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-slate-800 font-bold text-base">No jobs matched your search.</p>
                    <p className="text-xs text-slate-500">Try adjusting your keywords or clearing the search filters.</p>
                    <button
                      onClick={handleResetFilters}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0d47a1] to-[#1565c0] text-white font-bold text-xs shadow-md hover:from-[#1565c0] hover:to-[#1e40af] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2.5">
                      {paginatedJobs.map((job, idx) => (
                        <JobCardItem
                          key={job.id || idx}
                          job={job}
                          onReadMore={handleOpenDescription}
                          onSocialShare={handleSocialShare}
                        />
                      ))}
                    </div>

                    {/* Pagination Bar for Card View */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <span>Show</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 cursor-pointer focus:ring-2 focus:ring-primary"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <span>jobs per page</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1.5 text-slate-600 font-bold">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <DataTable
                  data={jobPostings}
                  isLoading={loading}
                  emptyMessage="No jobs matched your search."
                  pageSize={pageSize}
                  serverPagination={{
                    page: currentPage,
                    pageSize: pageSize,
                    totalCount: totalJobs,
                    onPageChange: (p) => setCurrentPage(p),
                    onPageSizeChange: (s) => setPageSize(s),
                  }}
                  columns={[
                    {
                      header: "Company Name",
                      accessorKey: "company_name",
                      sortable: true,
                      className: "font-semibold text-slate-700 text-sm py-4",
                    },
                    {
                      header: "Role Title",
                      accessorKey: "role_title",
                      sortable: true,
                      className: "text-slate-800 font-bold text-sm py-4",
                    },
                    {
                      header: "Employment Type",
                      accessorKey: "employment_type",
                      sortable: true,
                      className: "py-4 text-xs font-semibold",
                      render: (job: any) => job.employment_type ? (
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200/60 font-semibold">
                          {job.employment_type}
                        </span>
                      ) : <span className="text-slate-400">—</span>
                    },
                    {
                      header: "Experience Required",
                      accessorKey: "experience_required",
                      sortable: true,
                      className: "py-4 text-xs font-semibold",
                      render: (job: any) => job.experience_required ? (
                        <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-200/60 font-semibold">
                          {job.experience_required}
                        </span>
                      ) : <span className="text-slate-400">—</span>
                    },
                    {
                      header: "Work Mode",
                      accessorKey: "work_mode",
                      sortable: true,
                      className: "py-4 text-xs font-semibold",
                      render: (job: any) => job.work_mode ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200/60 font-semibold">
                          {job.work_mode}
                        </span>
                      ) : <span className="text-slate-400">—</span>
                    },
                    {
                      header: "City",
                      accessorKey: "city",
                      sortable: true,
                      className: "py-4 text-xs font-medium text-slate-700",
                      render: (job: any) => job.city || <span className="text-slate-400">—</span>
                    },
                    {
                      header: "State",
                      accessorKey: "state",
                      sortable: true,
                      className: "py-4 text-xs font-medium text-slate-700",
                      render: (job: any) => job.state || <span className="text-slate-400">—</span>
                    },
                    {
                      header: "Country",
                      accessorKey: "country",
                      sortable: true,
                      className: "py-4 text-xs font-medium text-slate-700",
                      render: (job: any) => job.country || <span className="text-slate-400">—</span>
                    },
                    {
                      header: "Salary",
                      accessorKey: "salary",
                      sortable: true,
                      className: "py-4 text-xs font-bold text-slate-800",
                      render: (job: any) => formatSalaryDisplay(job.salary || job.salary_range || job.pay_range)
                    },
                    {
                      header: "Visa Eligibility",
                      accessorKey: "visa_eligibility",
                      sortable: true,
                      className: "py-4 text-xs font-semibold",
                      render: (job: any) => job.visa_eligibility ? (
                        <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200/60 font-semibold">
                          {job.visa_eligibility}
                        </span>
                      ) : <span className="text-slate-400">—</span>
                    },
                    {
                      header: "Job Description",
                      render: (job: any) => (
                        <JobDescriptionCell
                          company={job.company_name}
                          role={job.role_title}
                          description={job.job_description}
                          job={job}
                          onReadMore={handleOpenDescription}
                        />
                      ),
                      className: "max-w-md py-4",
                    },
                    {
                      header: "Job Link",
                      render: (job: any) => (
                        job.job_url ? (
                          <a
                            href={job.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="apply-btn px-4 py-2 rounded-xl inline-flex items-center gap-1.5 transition-all text-xs"
                          >
                            Apply Now
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )
                      ),
                      className: "py-4",
                    },
                    {
                      header: "Log Date",
                      sortable: true,
                      accessorKey: "log_date",
                      render: (job: any) => (
                        <div className="flex items-center gap-1 text-slate-500 font-medium text-xs justify-center">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDate(job.log_date || job.created_at)}</span>
                        </div>
                      ),
                      className: "py-4",
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Comprehensive Job Details Modal */}
      <Dialog open={!!activeJobDesc} onOpenChange={(open) => !open && setActiveJobDesc(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 font-sans space-y-4">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-bold flex flex-col gap-1 text-left">
              <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Job Details Modal</span>
              <span className="text-slate-900 font-extrabold text-2xl leading-snug">{activeJobDesc?.role}</span>
              <div className="flex items-center gap-3 text-sm mt-1">
                <span className="text-primary font-bold">{activeJobDesc?.company}</span>
                {activeJobDesc?.posting_date && (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                    Posted: {activeJobDesc.posting_date}
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Job Details Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-3 border-b border-slate-100 text-xs bg-slate-50/50 p-4 rounded-xl">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Company</p>
              <p className="font-bold text-slate-800">{activeJobDesc?.company || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Location</p>
              <p className="font-semibold text-slate-800">{activeJobDesc?.location || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Employment Type</p>
              <p className="font-semibold text-slate-800">{activeJobDesc?.employment_type || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Salary</p>
              <p className="font-bold text-blue-700">{activeJobDesc?.salary || "Not Disclosed"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Visa Information</p>
              <p className="font-semibold text-amber-800">{activeJobDesc?.visa_eligibility || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Required Skills</p>
              <p className="font-semibold text-slate-800">{activeJobDesc?.skills || "—"}</p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-[10px] uppercase font-bold text-slate-400">Application Link</p>
              {activeJobDesc?.job_url ? (
                <a
                  href={activeJobDesc.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-bold text-xs truncate block mt-0.5"
                >
                  {activeJobDesc.job_url}
                </a>
              ) : (
                <p className="text-slate-400 font-medium">—</p>
              )}
            </div>
          </div>

          {/* Full Description Section */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">Full Description</p>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700 max-h-[38vh] overflow-y-auto pr-2 font-medium bg-white p-3 rounded-xl border border-slate-100">
              {activeJobDesc?.description}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Copy Link Button */}
              <button
                onClick={() => handleSocialShare("copy", activeJobDesc?.rawJob || activeJobDesc)}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                📋 Copy Link
              </button>

              {/* Share Dropdown Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
                  <DropdownMenuItem onClick={() => handleSocialShare("linkedin", activeJobDesc?.rawJob || activeJobDesc)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                    💼 LinkedIn
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSocialShare("whatsapp", activeJobDesc?.rawJob || activeJobDesc)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                    💬 WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSocialShare("facebook", activeJobDesc?.rawJob || activeJobDesc)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                    👥 Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSocialShare("x", activeJobDesc?.rawJob || activeJobDesc)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                    𝕏 Share on X
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSocialShare("email", activeJobDesc?.rawJob || activeJobDesc)} className="text-xs font-semibold text-slate-700 cursor-pointer">
                    ✉️ Email
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Apply Now Button */}
            {activeJobDesc?.job_url ? (
              <a
                href={activeJobDesc.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-gradient-to-r from-[#0d47a1] to-[#1565c0] hover:from-[#1565c0] hover:to-[#1e40af] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                APPLY NOW
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <button
                disabled
                className="px-6 py-2.5 bg-slate-200 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-wider opacity-60 cursor-not-allowed"
              >
                NO LINK AVAILABLE
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
