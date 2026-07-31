import React, { useState, useEffect, useMemo } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { recruitersApi } from "@/services/api";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search, Globe, X, ExternalLink, Calendar, LayoutGrid, Table, Share2, MapPin,
  Briefcase, DollarSign, Clock, UserCheck, MoreHorizontal, Home, Award, Ban, Heart,
  Sparkles, Lock, Filter, ChevronDown
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const JobCardItem = ({
  job,
  onReadMore,
  onSocialShare,
}: {
  job: any;
  onReadMore: (jobOrCompany: any, role?: string, desc?: string) => void;
  onSocialShare: (platform: string, job: any) => void;
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  const companyName = job.company_name || job.company || "Company";
  const roleTitle = job.role_title || job.title || job.role || "Job Opening";
  const tagline = job.company_tagline || job.industry || "Job Opening";

  const locationParts = [job.city, job.state, job.country].filter(Boolean).join(", ");
  const location = locationParts || job.location || "-";
  const workType = job.work_mode || job.work_type || job.remote_type || "-";
  const employmentType = job.employment_type || job.job_type || "-";
  const expLevel = job.experience_required || job.experience_level || job.level || "-";
  const salary = job.salary || job.salary_range || job.pay_range || "-";
  const visaEligibility = job.visa_eligibility || null;
  const applicantsCount = job.applicants_count || "-";

  const postedDate = formatDate(job.log_date || job.created_at);

  const handleToggleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: !isSaved ? "Job Saved!" : "Job Removed",
      description: !isSaved ? `Saved ${roleTitle} to your bookmarks.` : `Removed ${roleTitle} from saved jobs.`,
    });
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-xs hover:shadow-md transition-all duration-300 space-y-4 group">
      {/* Top Header Row */}
      <div className="flex items-start gap-4">
        {/* Company Logo Container */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white flex items-center justify-center font-black text-2xl shadow-xs shrink-0 mt-0.5">
          {companyName.charAt(0).toUpperCase()}
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0">
          {/* Badge Row */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="bg-blue-50 text-blue-800 border border-blue-200/60 px-2.5 py-0.5 rounded-md flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-600" />
              {postedDate}
            </span>
            {visaEligibility && (
              <span className="bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-0.5 rounded-md">
                Visa: {visaEligibility}
              </span>
            )}
            <span className="bg-indigo-50 text-indigo-800 border border-indigo-200/60 px-2.5 py-0.5 rounded-md">
              Verified Opening
            </span>
          </div>

          {/* Job Title */}
          <h3
            onClick={() => onReadMore(job)}
            className="text-lg md:text-xl font-extrabold text-slate-900 hover:text-primary transition-colors cursor-pointer mt-1.5 leading-snug"
          >
            {roleTitle}
          </h3>

          {/* Company Name */}
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5 truncate">
            <span className="font-bold text-slate-700">{companyName}</span>
          </p>
        </div>

        {/* Far Right Action Menu */}
        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Share job"
              >
                <Share2 className="h-4 w-4" />
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
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Middle Grid Row - 3 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs md:text-sm text-slate-600 font-medium border-t border-slate-100">
        {/* Column 1 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">{workType}</span>
          </div>
        </div>

        {/* Column 2 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{employmentType}</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{expLevel}</span>
          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-bold text-blue-700">{salary}</span>
          </div>
          {visaEligibility && (
            <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{visaEligibility}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Row */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Applicant Info */}
        <span className="text-xs text-slate-400 font-medium">
          {applicantsCount}
        </span>

        {/* Right Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bookmark / Heart Button */}
          <button
            onClick={handleToggleSave}
            className={`p-2 border border-slate-200/90 rounded-full transition-colors cursor-pointer ${isSaved
              ? "bg-rose-50 border-rose-200 text-rose-600"
              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
            title={isSaved ? "Saved" : "Save job"}
          >
            <Heart className={`h-4 w-4 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>

          {/* Ask Hyrind / Read More */}
          <button
            onClick={() => onReadMore(job)}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80 rounded-full text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Read Details
          </button>

          {/* Direct Apply Button */}
          {job.job_url ? (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-[#0d47a1] to-[#1565c0] hover:from-[#1565c0] hover:to-[#1e40af] text-white font-black rounded-full text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              APPLY NOW
              <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
            </a>
          ) : (
            <button
              onClick={() => onReadMore(job)}
              className="px-5 py-2.5 bg-gradient-to-r from-[#0d47a1] to-[#1565c0] hover:from-[#1565c0] hover:to-[#1e40af] text-white font-black rounded-full text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              APPLY WITH AUTOFILL
            </button>
          )}
        </div>
      </div>
    </div>
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
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Pagination states
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [filterLocation, setFilterLocation] = useState("All Locations");
  const [filterWorkMode, setFilterWorkMode] = useState("All Work Modes");
  const [filterType, setFilterType] = useState("All Types");
  const [filterExp, setFilterExp] = useState("All Experience");
  const [filterVisa, setFilterVisa] = useState("All Visa Types");
  const [filterSalary, setFilterSalary] = useState("All Salaries");
  const [filterIndustry, setFilterIndustry] = useState("All Industries");
  const [filterDate, setFilterDate] = useState("All Time");
  const [sortOrder, setSortOrder] = useState("Newest First");

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.paddingTop = '80px';
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const res = await recruitersApi.getPublicJobAlerts();
        setJobPostings(res.data || []);
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
    };
    fetchAlerts();
  }, [toast]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchTitle, searchCompany, searchSkills, filterLocation, filterWorkMode, filterType, filterExp, filterVisa, filterSalary, filterIndustry, filterDate, sortOrder, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSearchTitle("");
    setSearchCompany("");
    setSearchSkills("");
    setFilterLocation("All Locations");
    setFilterWorkMode("All Work Modes");
    setFilterType("All Types");
    setFilterExp("All Experience");
    setFilterVisa("All Visa Types");
    setFilterSalary("All Salaries");
    setFilterIndustry("All Industries");
    setFilterDate("All Time");
    setSortOrder("Newest First");
    setCurrentPage(1);
    toast({ title: "Filters Reset", description: "All search and dropdown filters have been cleared." });
  };

  const filteredJobs = useMemo(() => {
    let result = jobPostings.filter((job) => {
      // 1. Job Title Filter
      if (searchTitle.trim()) {
        const q = searchTitle.toLowerCase().trim();
        const roleStr = (job.role_title || job.title || job.role || "").toLowerCase();
        if (!roleStr.includes(q)) return false;
      }

      // 2. Company Filter
      if (searchCompany.trim()) {
        const q = searchCompany.toLowerCase().trim();
        const companyStr = (job.company_name || job.company || "").toLowerCase();
        if (!companyStr.includes(q)) return false;
      }

      // 3. Global Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (job.role_title && job.role_title.toLowerCase().includes(q)) ||
          (job.title && job.title.toLowerCase().includes(q)) ||
          (job.role && job.role.toLowerCase().includes(q));

        const matchCompany = (job.company_name && job.company_name.toLowerCase().includes(q)) ||
          (job.company && job.company.toLowerCase().includes(q));

        let matchSkill = false;
        if (job.skills) {
          if (Array.isArray(job.skills)) {
            matchSkill = job.skills.some((s: any) => String(s).toLowerCase().includes(q));
          } else if (typeof job.skills === "string") {
            matchSkill = job.skills.toLowerCase().includes(q);
          }
        }

        const matchKeyword = (job.job_description && job.job_description.toLowerCase().includes(q)) ||
          Object.values(job).some((val) => typeof val === "string" && val.toLowerCase().includes(q));

        if (!(matchTitle || matchCompany || matchSkill || matchKeyword)) return false;
      }

      // 4. Location Filter
      if (filterLocation && filterLocation !== "All Locations") {
        const locParts = [job.city, job.state, job.country, job.location].filter(Boolean).join(" ").toLowerCase();
        if (!locParts.includes(filterLocation.toLowerCase())) return false;
      }

      // 5. Remote / Hybrid / Onsite (Work Mode) Filter
      if (filterWorkMode && filterWorkMode !== "All Work Modes") {
        const workStr = (job.work_mode || job.work_type || job.remote_type || "").toLowerCase();
        if (!workStr.includes(filterWorkMode.toLowerCase())) return false;
      }

      // 6. Employment Type Filter
      if (filterType && filterType !== "All Types") {
        const typeStr = (job.employment_type || job.job_type || "").toLowerCase();
        if (!typeStr.includes(filterType.toLowerCase())) return false;
      }

      // 7. Experience Filter
      if (filterExp && filterExp !== "All Experience") {
        const expStr = (job.experience_required || job.experience_level || job.level || "").toLowerCase();
        if (!expStr.includes(filterExp.toLowerCase())) return false;
      }

      // 8. Visa Type Filter
      if (filterVisa && filterVisa !== "All Visa Types") {
        const visaStr = (job.visa_eligibility || "").toLowerCase();
        if (!visaStr.includes(filterVisa.toLowerCase())) return false;
      }

      // 9. Salary Filter
      if (filterSalary === "Disclosed Only") {
        const sal = (job.salary || "").trim();
        if (!sal || sal === "Not Disclosed" || sal === "-") return false;
      }

      // 10. Industry Filter
      if (filterIndustry && filterIndustry !== "All Industries") {
        const indStr = (job.industry || job.company_tagline || "").toLowerCase();
        if (!indStr.includes(filterIndustry.toLowerCase())) return false;
      }

      // 11. Skills Filter
      if (searchSkills.trim()) {
        const q = searchSkills.toLowerCase().trim();
        let match = false;
        if (job.skills) {
          if (Array.isArray(job.skills)) {
            match = job.skills.some((s: any) => String(s).toLowerCase().includes(q));
          } else if (typeof job.skills === "string") {
            match = job.skills.toLowerCase().includes(q);
          }
        }
        if (!match && job.job_description) {
          match = job.job_description.toLowerCase().includes(q);
        }
        if (!match) return false;
      }

      // 12. Date Posted Filter
      if (filterDate && filterDate !== "All Time") {
        const logDateStr = job.log_date || job.created_at;
        if (logDateStr) {
          const cleanDateStr = logDateStr.split("T")[0];
          const [y, m, d] = cleanDateStr.split("-").map((s: string) => parseInt(s, 10));
          const itemDate = new Date(y, m - 1, d);
          itemDate.setHours(0, 0, 0, 0);

          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24));

          if (filterDate === "Posted Today" && diffDays > 0) return false;
          if (filterDate === "Past 3 Days" && diffDays > 3) return false;
          if (filterDate === "Past Week" && diffDays > 7) return false;
          if (filterDate === "Past Month" && diffDays > 30) return false;
        }
      }

      return true;
    });

    // 13 & 14. Sort Order (Newest First / Oldest First)
    result.sort((a, b) => {
      const dateA = new Date(a.log_date || a.created_at || 0).getTime();
      const dateB = new Date(b.log_date || b.created_at || 0).getTime();
      if (sortOrder === "Oldest First") {
        return dateA - dateB;
      }
      return dateB - dateA; // Newest First
    });

    return result;
  }, [
    jobPostings, searchTitle, searchCompany, searchQuery, filterLocation,
    filterWorkMode, filterType, filterExp, filterVisa, filterSalary,
    filterIndustry, searchSkills, filterDate, sortOrder
  ]);

  const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredJobs.slice(start, start + pageSize);
  }, [filteredJobs, currentPage, pageSize]);

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
        salary: j.salary || j.salary_range || "Not Disclosed",
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
          navigator.share({ title: `${role} at ${company}`, text, url }).catch(() => {});
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
          padding: 120px 24px 45px;
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
          font-size: clamp(2.25rem, 5vw, 3.25rem);
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.04em;
          line-height: 1.1;
        }

        .hero-subtitle {
          font-size: 1.125rem;
          opacity: 0.9;
          font-weight: 300;
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .job-alerts-main {
          padding: 80px 24px;
          background-color: #f8fafc;
          flex-grow: 1;
        }

        .job-alerts-container {
          max-width: 1200px;
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
        <div className="job-alerts-container space-y-8">
          {/* Single Unified Search & Filter Panel */}
          {/* Search & Filter Panel */}
          <Card className="filter-card border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-5 md:p-6 space-y-4">
              {/* Top Search Inputs Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                    placeholder="Skills (e.g. React, Python)..."
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
              </div>

              {/* Filter Pills Bar BELOW Search Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-slate-700">
                {/* 1. Location Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterLocation !== "All Locations"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      <MapPin className="h-3 w-3" />
                      {filterLocation}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[170px] z-50">
                    {["All Locations", "United States", "Remote", "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA"].map((loc) => (
                      <DropdownMenuItem
                        key={loc}
                        onClick={() => setFilterLocation(loc)}
                        className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {loc}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 2. Remote / Hybrid / Onsite Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterWorkMode !== "All Work Modes"
                      ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200/80"
                      }`}>
                      <Home className="h-3 w-3" />
                      {filterWorkMode}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
                    {["All Work Modes", "Remote", "Hybrid", "Onsite"].map((wm) => (
                      <DropdownMenuItem
                        key={wm}
                        onClick={() => setFilterWorkMode(wm)}
                        className="text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {wm}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 3. Employment Type Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterType !== "All Types"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      <Briefcase className="h-3 w-3" />
                      {filterType}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[170px] z-50">
                    {["All Types", "Full-Time", "Contract", "Contract-to-Hire", "Internship", "W2", "C2C"].map((t) => (
                      <DropdownMenuItem
                        key={t}
                        onClick={() => setFilterType(t)}
                        className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {t}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 4. Experience Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterExp !== "All Experience"
                      ? "bg-purple-600 text-white border-purple-600 font-bold shadow-xs"
                      : "bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200/80"
                      }`}>
                      <Award className="h-3 w-3" />
                      {filterExp}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[170px] z-50">
                    {["All Experience", "0–2 Years", "2–5 Years", "5+ Years", "Senior Level"].map((y) => (
                      <DropdownMenuItem
                        key={y}
                        onClick={() => setFilterExp(y)}
                        className="text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {y}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 5. Visa Type Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterVisa !== "All Visa Types"
                      ? "bg-amber-600 text-white border-amber-600 font-bold shadow-xs"
                      : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200/80"
                      }`}>
                      <Sparkles className="h-3 w-3" />
                      {filterVisa}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[190px] z-50">
                    {["All Visa Types", "OPT", "STEM OPT", "H1B", "H1B Transfer", "USC", "Green Card", "All Work Authorization"].map((v) => (
                      <DropdownMenuItem
                        key={v}
                        onClick={() => setFilterVisa(v)}
                        className="text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {v}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 6. Salary Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterSalary !== "All Salaries"
                      ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200/80"
                      }`}>
                      <DollarSign className="h-3 w-3" />
                      {filterSalary}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
                    {["All Salaries", "Disclosed Only"].map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => setFilterSalary(s)}
                        className="text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 7. Industry Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterIndustry !== "All Industries"
                      ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                      : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200/80"
                      }`}>
                      <Globe className="h-3 w-3" />
                      {filterIndustry}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[170px] z-50">
                    {["All Industries", "Technology", "Healthcare", "Finance", "Cybersecurity", "Education"].map((ind) => (
                      <DropdownMenuItem
                        key={ind}
                        onClick={() => setFilterIndustry(ind)}
                        className="text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {ind}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 8. Date Posted Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterDate !== "All Time"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      <Clock className="h-3 w-3" />
                      {filterDate}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
                    {["All Time", "Posted Today", "Past 3 Days", "Past Week", "Past Month"].map((d) => (
                      <DropdownMenuItem
                        key={d}
                        onClick={() => setFilterDate(d)}
                        className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {d}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 9. Sort Order Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-semibold bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer">
                      <Filter className="h-3 w-3 text-slate-500" />
                      {sortOrder}
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
                        {so}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Reset Filters Button */}
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#0d47a1] to-[#1565c0] text-white font-bold hover:from-[#1565c0] hover:to-[#1e40af] transition-all whitespace-nowrap cursor-pointer text-xs shadow-xs"
                >
                  <X className="h-3 w-3" />
                  Reset Filters
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Job Listings Panel */}
          <Card className="table-card border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5 md:p-6 flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <Globe className="h-5 w-5 text-primary" />
                All Available Job Openings ({filteredJobs.length})
              </CardTitle>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-200/70 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "cards"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "table"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <Table className="h-3.5 w-3.5" />
                  Table
                </button>
              </div>
            </CardHeader>

            <CardContent className={viewMode === "cards" ? "p-5 md:p-6" : "p-0"}>
              {viewMode === "cards" ? (
                loading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-52 rounded-2xl bg-slate-100 animate-pulse p-6 space-y-4">
                        <div className="h-8 w-1/3 bg-slate-200 rounded-lg" />
                        <div className="h-5 w-2/3 bg-slate-200 rounded-lg" />
                        <div className="h-4 w-full bg-slate-200 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : filteredJobs.length === 0 ? (
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
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
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
                          onChange={(e) => setPageSize(Number(e.target.value))}
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
                  data={filteredJobs}
                  isLoading={loading}
                  emptyMessage="No jobs matched your search."
                  pageSize={pageSize}
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
                      render: (job: any) => job.salary || "Not Disclosed"
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
