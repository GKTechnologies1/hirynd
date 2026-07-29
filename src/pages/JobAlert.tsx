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
  onReadMore
}: {
  company: string;
  role: string;
  description?: string;
  onReadMore: (company: string, role: string, desc: string) => void;
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
          onReadMore(company, role, description);
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
  onShare,
}: {
  job: any;
  onReadMore: (company: string, role: string, desc: string) => void;
  onShare: (job: any) => void;
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  const companyName = job.company_name || job.company || "Bridgeway Benefit Technologies";
  const roleTitle = job.role_title || job.title || job.role || "Associate Security Engineer";
  const tagline = job.company_tagline || job.industry || "Multiemployer benefits administration software for Taft-Hartley plans";

  const location = job.location || "United States";
  const workType = job.work_type || job.remote_type || "Remote";
  const employmentType = job.employment_type || job.job_type || "Full-time";
  const expLevel = job.experience_level || job.level || "Entry Level";
  const expYears = job.experience_years || "1+ years exp";
  const salary = job.salary || job.salary_range || job.pay_range || null;
  const applicantsCount = job.applicants_count || "Less than 25 applicants";

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
            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-slate-500" />
              1 former colleague works here
            </span>
            <span className="bg-indigo-50 text-indigo-800 border border-indigo-200/60 px-2.5 py-0.5 rounded-md">
              Be an early applicant
            </span>
          </div>

          {/* Job Title */}
          <h3
            onClick={() => job.job_description && onReadMore(companyName, roleTitle, job.job_description)}
            className="text-lg md:text-xl font-extrabold text-slate-900 hover:text-primary transition-colors cursor-pointer mt-1.5 leading-snug"
          >
            {roleTitle}
          </h3>

          {/* Company Name & Industry Tagline */}
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5 truncate">
            <span className="font-bold text-slate-700">{companyName}</span>
            <span className="mx-1.5 text-slate-300">/</span>
            <span>{tagline}</span>
          </p>
        </div>

        {/* Far Right Action Menu */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onShare(job)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Share job"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
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
          {salary ? (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="font-bold text-blue-700">{salary}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{expYears}</span>
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
          {/* Dismiss Button */}
          <button
            className="p-2 border border-slate-200/90 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="Not interested"
          >
            <Ban className="h-4 w-4" />
          </button>

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
            onClick={() => onReadMore(companyName, roleTitle, job.job_description || tagline)}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80 rounded-full text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            ASK HYRIND
          </button>

          {/* Apply Button */}
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
              onClick={() => onReadMore(companyName, roleTitle, job.job_description || tagline)}
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
  const [activeJobDesc, setActiveJobDesc] = useState<{ company: string; role: string; description: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Dropdown filter states
  const [filterLocation, setFilterLocation] = useState("All Locations");
  const [filterRole, setFilterRole] = useState("All Roles");
  const [filterLevel, setFilterLevel] = useState("All Levels");
  const [filterType, setFilterType] = useState("All Types");
  const [filterWorkplace, setFilterWorkplace] = useState("All Workplace");
  const [filterDate, setFilterDate] = useState("Date Posted");
  const [filterIndustry, setFilterIndustry] = useState("Industry");
  const [filterExp, setFilterExp] = useState("Years of Experience");

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

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterLocation("All Locations");
    setFilterRole("All Roles");
    setFilterLevel("All Levels");
    setFilterType("All Types");
    setFilterWorkplace("All Workplace");
    setFilterDate("Date Posted");
    setFilterIndustry("Industry");
    setFilterExp("Years of Experience");
    toast({ title: "Filters Reset", description: "All search and dropdown filters have been cleared." });
  };

  const filteredJobs = useMemo(() => {
    return jobPostings.filter((job) => {
      // 1. Text Search Query
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

      // 2. Location Filter
      if (filterLocation && filterLocation !== "All Locations" && filterLocation !== "United States") {
        const loc = (job.location || "United States").toLowerCase();
        if (!loc.includes(filterLocation.toLowerCase())) return false;
      }

      // 3. Role Title Filter
      if (filterRole && filterRole !== "All Roles" && !filterRole.includes("Network Engineer")) {
        const roleStr = (job.role_title || job.title || job.role || "").toLowerCase();
        if (!roleStr.includes(filterRole.toLowerCase())) return false;
      }

      // 4. Experience Level Filter
      if (filterLevel && filterLevel !== "All Levels" && filterLevel !== "Entry Level") {
        const lvlStr = (job.experience_level || job.level || "Entry Level").toLowerCase();
        if (!lvlStr.includes(filterLevel.toLowerCase())) return false;
      }

      // 5. Employment Type Filter
      if (filterType && filterType !== "All Types" && filterType !== "Full-time") {
        const typeStr = (job.employment_type || job.job_type || "Full-time").toLowerCase();
        if (!typeStr.includes(filterType.toLowerCase())) return false;
      }

      // 6. Workplace Filter
      if (filterWorkplace && filterWorkplace !== "All Workplace" && !filterWorkplace.includes("Onsite")) {
        const workStr = (job.work_type || job.remote_type || "Remote").toLowerCase();
        const targetWp = filterWorkplace.split(" ")[0].toLowerCase();
        if (!workStr.includes(targetWp)) return false;
      }

      return true;
    });
  }, [jobPostings, searchQuery, filterLocation, filterRole, filterLevel, filterType, filterWorkplace]);

  const handleOpenDescription = (company: string, role: string, description: string) => {
    setActiveJobDesc({ company, role, description });
  };

  const handleShareJob = (job: any) => {
    const company = job.company_name || job.company || "Company";
    const role = job.role_title || job.title || job.role || "Job Opening";
    const url = job.job_url || window.location.href;

    if (navigator.share && job.job_url) {
      navigator.share({
        title: `${role} at ${company}`,
        text: `Check out this opening for ${role} at ${company}`,
        url: url,
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied!",
        description: `Job link for ${role} at ${company} copied to clipboard.`,
      });
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
          <Card className="filter-card border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-5 md:p-6 space-y-4">
              {/* Main Search Input */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <Label htmlFor="search-jobs-input" className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    Search Jobs
                  </Label>
                  <span className="text-xs text-slate-500 font-medium">
                    Search by Job Title, Company, Skill, or Keyword
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="search-jobs-input"
                    type="text"
                    placeholder="Search Job Title, Company, Skill, Keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 h-11 border-slate-200 focus-visible:ring-primary focus-visible:ring-2 rounded-xl text-xs sm:text-sm bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Pills Bar BELOW Search Bar (Hyrind Blue Theme Dropdowns) */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-slate-700">
                {/* 1. Location Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterLocation !== "All Locations"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      {filterLocation}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[170px] z-50">
                    {["All Locations", "United States", "Remote", "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX"].map((loc) => (
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

                {/* 2. Role Title Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterRole !== "All Roles"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      {filterRole}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[190px] z-50">
                    {["All Roles", "Network Engineer (+4)", "Software Engineer", "Security Engineer", "Data Analyst", "DevOps Engineer"].map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => setFilterRole(role)}
                        className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {role}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 3. Experience Level Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterLevel !== "All Levels"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      {filterLevel}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
                    {["All Levels", "Internship", "Entry Level", "Mid-Level", "Senior Level", "Director"].map((lvl) => (
                      <DropdownMenuItem
                        key={lvl}
                        onClick={() => setFilterLevel(lvl)}
                        className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {lvl}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 4. Full-Time / Employment Type Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterType !== "All Types"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      {filterType}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
                    {["All Types", "Full-time", "Part-time", "Contract", "Internship"].map((t) => (
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

                {/* 5. Workplace Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterWorkplace !== "All Workplace"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      {filterWorkplace}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
                    {["All Workplace", "Onsite (+2)", "Remote", "Hybrid"].map((wp) => (
                      <DropdownMenuItem
                        key={wp}
                        onClick={() => setFilterWorkplace(wp)}
                        className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {wp}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 6. Date Posted Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterDate !== "Date Posted"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      {filterDate}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[160px] z-50">
                    {["Date Posted", "Past 24 Hours", "Past 7 Days", "Past 30 Days", "Anytime"].map((d) => (
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

                {/* 7. Industry Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterIndustry !== "Industry"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      {filterIndustry}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[170px] z-50">
                    {["Industry", "Technology", "Healthcare", "Finance", "Cybersecurity", "Education"].map((ind) => (
                      <DropdownMenuItem
                        key={ind}
                        onClick={() => setFilterIndustry(ind)}
                        className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {ind}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 8. Years of Experience Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${filterExp !== "Years of Experience"
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                      : "bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200/80"
                      }`}>
                      {filterExp}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white rounded-xl shadow-lg border border-slate-200 p-1 min-w-[180px] z-50">
                    {["Years of Experience", "0-1 Years", "1-3 Years", "3-5 Years", "5+ Years"].map((y) => (
                      <DropdownMenuItem
                        key={y}
                        onClick={() => setFilterExp(y)}
                        className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-3 py-2"
                      >
                        {y}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Reset / All Filters Button */}
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#0d47a1] to-[#1565c0] text-white font-bold hover:from-[#1565c0] hover:to-[#1e40af] transition-all whitespace-nowrap cursor-pointer text-xs shadow-xs"
                >
                  <Filter className="h-3 w-3" />
                  All Filters
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
                  <div className="text-center py-12 space-y-3">
                    <Search className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-slate-600 font-semibold">No job openings match your search.</p>
                    <p className="text-xs text-slate-400">Try adjusting your keywords or clearing the search bar.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredJobs.map((job, idx) => (
                      <JobCardItem
                        key={job.id || idx}
                        job={job}
                        onReadMore={handleOpenDescription}
                        onShare={handleShareJob}
                      />
                    ))}
                  </div>
                )
              ) : (
                <DataTable
                  data={filteredJobs}
                  isLoading={loading}
                  emptyMessage="No job openings match your search."
                  pageSize={10}
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
                      header: "Job Description",
                      render: (job: any) => (
                        <JobDescriptionCell
                          company={job.company_name}
                          role={job.role_title}
                          description={job.job_description}
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

      {/* Description Modal */}
      <Dialog open={!!activeJobDesc} onOpenChange={(open) => !open && setActiveJobDesc(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 font-sans">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-lg font-bold flex flex-col gap-1 text-left">
              <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Job Description</span>
              <span className="text-slate-800 font-extrabold text-xl">{activeJobDesc?.role}</span>
              <span className="text-primary text-sm font-semibold">{activeJobDesc?.company}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed text-slate-600 max-h-[50vh] overflow-y-auto pr-2 font-medium">
            {activeJobDesc?.description}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
