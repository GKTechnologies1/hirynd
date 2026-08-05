import React, { useState, useEffect, useMemo, useCallback } from "react";
import { recruitersApi, jobsApi } from "@/services/api";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Globe, X, ExternalLink, LayoutGrid, Table, Share2, MapPin,
  Briefcase, DollarSign, Clock, MoreHorizontal, Home, Award, Ban, Heart,
  Sparkles, Filter, ChevronDown, Plus, Pencil, Trash2, RefreshCw, XCircle, Building
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// ── Job Description Cell ──
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

// ── Job Card Component with Edit, Reject, and Delete Action Buttons ──
const JobCardItem = ({
  job,
  onReadMore,
  onSocialShare,
  onEdit,
  onReject,
  onDelete,
}: {
  job: any;
  onReadMore: (jobOrCompany: any, role?: string, desc?: string) => void;
  onSocialShare: (platform: string, job: any) => void;
  onEdit: (job: any) => void;
  onReject: (job: any) => void;
  onDelete: (job: any) => void;
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  const companyName = job.company_name || job.company || "Company";
  const roleTitle = job.role_title || job.title || job.role || "Job Opening";

  const locationParts = [job.city, job.state, job.country].filter(Boolean).join(", ");
  const location = locationParts || job.location || "-";
  const workType = job.work_mode || job.work_type || job.remote_type || "-";
  const employmentType = job.employment_type || job.job_type || "-";
  const expLevel = job.experience_required || job.experience_level || job.level || "-";
  const salary = job.salary || job.salary_range || job.pay_range || "-";
  const visaEligibility = job.visa_eligibility || null;
  const applicantsCount = job.applicants_count || "-";

  const isExpired = job.application_status === "expired" || job.status === "expired";
  const isRejected = job.application_status === "rejected" || job.status === "rejected";

  const postedDate = formatDate(job.log_date || job.created_at);

  const handleToggleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: !isSaved ? "Job Saved!" : "Job Removed",
      description: !isSaved ? `Saved ${roleTitle} to bookmarks.` : `Removed ${roleTitle} from bookmarks.`,
    });
  };

  return (
    <div className={`bg-card border ${isRejected ? 'border-amber-300 bg-amber-50/30' : isExpired ? 'border-rose-200 bg-rose-50/20' : 'border-border/80'} rounded-2xl p-5 md:p-6 shadow-xs hover:shadow-md transition-all duration-300 space-y-4 group relative`}>
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
            {isRejected ? (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                <XCircle className="h-3 w-3 text-amber-600" />
                Rejected
              </span>
            ) : isExpired ? (
              <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-md font-bold">
                Expired
              </span>
            ) : (
              <span className="bg-indigo-50 text-indigo-800 border border-indigo-200/60 px-2.5 py-0.5 rounded-md">
                Verified Opening
              </span>
            )}
          </div>

          {/* Job Title */}
          <h3
            onClick={() => onReadMore(job)}
            className="text-lg md:text-xl font-extrabold text-foreground hover:text-primary transition-colors cursor-pointer mt-1.5 leading-snug"
          >
            {roleTitle}
          </h3>

          {/* Company Name */}
          <p className="text-xs md:text-sm text-muted-foreground font-medium mt-0.5 truncate">
            <span className="font-bold text-foreground">{companyName}</span>
          </p>
        </div>

        {/* Action Menu */}
        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                title="Share job"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover rounded-xl shadow-lg border border-border p-1 min-w-[160px] z-50">
              <DropdownMenuItem onClick={() => onSocialShare("copy", job)} className="text-xs font-semibold cursor-pointer">
                📋 Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("linkedin", job)} className="text-xs font-semibold cursor-pointer">
                💼 LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("whatsapp", job)} className="text-xs font-semibold cursor-pointer">
                💬 WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("facebook", job)} className="text-xs font-semibold cursor-pointer">
                👥 Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("x", job)} className="text-xs font-semibold cursor-pointer">
                𝕏 Share on X
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSocialShare("email", job)} className="text-xs font-semibold cursor-pointer">
                ✉️ Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Middle Grid Row - 3 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs md:text-sm text-muted-foreground font-medium border-t border-border/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-foreground">{workType}</span>
          </div>
        </div>

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

      {/* Footer Row with Admin Actions (Edit, Reject, Delete) */}
      <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground font-medium">
          {applicantsCount}
        </span>

        {/* Action Buttons: Edit, Reject, Delete */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(job)}
            className="h-8 text-xs font-semibold text-blue-700 border-blue-200 bg-blue-50/80 hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>

          {!isRejected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(job)}
              className="h-8 text-xs font-semibold text-amber-700 border-amber-200 bg-amber-50/80 hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(job)}
            className="h-8 text-xs font-semibold text-rose-700 border-rose-200 bg-rose-50/80 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => onReadMore(job)}
            className="h-8 px-3 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            Read Details
          </Button>
        </div>
      </div>
    </div>
  );
};

const emptyJobAlertForm = {
  role_title: "",
  company_name: "",
  employment_type: "Full-Time",
  experience_required: "2–5 Years",
  work_mode: "Remote",
  city: "",
  state: "",
  country: "United States",
  salary: "$120,000 / yr",
  visa_eligibility: "H1B",
  job_description: "",
  job_url: "",
  is_public: true,
};

const AdminJobBoard = () => {
  const { toast } = useToast();
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Job Description Modal
  const [activeJobDesc, setActiveJobDesc] = useState<any | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [searchSkills, setSearchSkills] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  // Admin Modal States
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [jobForm, setJobForm] = useState({ ...emptyJobAlertForm });
  const [savingJob, setSavingJob] = useState(false);

  // Delete Job Dialog
  const [deleteJobTarget, setDeleteJobTarget] = useState<any | null>(null);

  const fetchAlerts = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchTitle, searchCompany, searchSkills, statusFilter, filterLocation, filterWorkMode, filterType, filterExp, filterVisa, filterSalary, filterIndustry, filterDate, sortOrder, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSearchTitle("");
    setSearchCompany("");
    setSearchSkills("");
    setStatusFilter("all");
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
      // Status Filter
      if (statusFilter !== "all") {
        const appStatus = (job.application_status || job.status || "").toLowerCase();
        if (appStatus !== statusFilter.toLowerCase()) return false;
      }

      if (searchTitle.trim()) {
        const q = searchTitle.toLowerCase().trim();
        const roleStr = (job.role_title || job.title || job.role || "").toLowerCase();
        if (!roleStr.includes(q)) return false;
      }

      if (searchCompany.trim()) {
        const q = searchCompany.toLowerCase().trim();
        const companyStr = (job.company_name || job.company || "").toLowerCase();
        if (!companyStr.includes(q)) return false;
      }

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

      if (filterLocation && filterLocation !== "All Locations") {
        const locParts = [job.city, job.state, job.country, job.location].filter(Boolean).join(" ").toLowerCase();
        if (!locParts.includes(filterLocation.toLowerCase())) return false;
      }

      if (filterWorkMode && filterWorkMode !== "All Work Modes") {
        const workStr = (job.work_mode || job.work_type || job.remote_type || "").toLowerCase();
        if (!workStr.includes(filterWorkMode.toLowerCase())) return false;
      }

      if (filterType && filterType !== "All Types") {
        const typeStr = (job.employment_type || job.job_type || "").toLowerCase();
        if (!typeStr.includes(filterType.toLowerCase())) return false;
      }

      if (filterExp && filterExp !== "All Experience") {
        const expStr = (job.experience_required || job.experience_level || job.level || "").toLowerCase();
        if (!expStr.includes(filterExp.toLowerCase())) return false;
      }

      if (filterVisa && filterVisa !== "All Visa Types") {
        const visaStr = (job.visa_eligibility || "").toLowerCase();
        if (!visaStr.includes(filterVisa.toLowerCase())) return false;
      }

      if (filterSalary === "Disclosed Only") {
        const sal = (job.salary || "").trim();
        if (!sal || sal === "Not Disclosed" || sal === "-") return false;
      }

      if (filterIndustry && filterIndustry !== "All Industries") {
        const indStr = (job.industry || job.company_tagline || "").toLowerCase();
        if (!indStr.includes(filterIndustry.toLowerCase())) return false;
      }

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

    result.sort((a, b) => {
      const dateA = new Date(a.log_date || a.created_at || 0).getTime();
      const dateB = new Date(b.log_date || b.created_at || 0).getTime();
      if (sortOrder === "Oldest First") {
        return dateA - dateB;
      }
      return dateB - dateA;
    });

    return result;
  }, [
    jobPostings, statusFilter, searchTitle, searchCompany, searchQuery, filterLocation,
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
        navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: `Job link copied to clipboard.` });
        break;
    }
  };

  // Admin Actions: Edit, Reject, Delete
  const handleOpenCreate = () => {
    setEditingJob(null);
    setJobForm({ ...emptyJobAlertForm });
    setJobDialogOpen(true);
  };

  const handleOpenEdit = (job: any) => {
    setEditingJob(job);
    setJobForm({
      role_title: job.role_title || job.title || "",
      company_name: job.company_name || job.company || "",
      employment_type: job.employment_type || "Full-Time",
      experience_required: job.experience_required || "2–5 Years",
      work_mode: job.work_mode || "Remote",
      city: job.city || "",
      state: job.state || "",
      country: job.country || "United States",
      salary: job.salary || "$120,000 / yr",
      visa_eligibility: job.visa_eligibility || "H1B",
      job_description: job.job_description || job.description || "",
      job_url: job.job_url || "",
      is_public: job.is_public ?? true,
    });
    setJobDialogOpen(true);
  };

  const handleRejectJob = async (job: any) => {
    try {
      await recruitersApi.updateJobField(job.id, { status: "rejected" });
      toast({
        title: "Job Rejected",
        description: `Marked "${job.role_title || job.title}" as rejected.`,
      });
      fetchAlerts();
    } catch (e: any) {
      toast({ title: "Rejection failed", description: e.message, variant: "destructive" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteJobTarget) return;
    try {
      await recruitersApi.deleteJobAlert(deleteJobTarget.id);
      toast({ title: "Job Deleted", description: `Deleted "${deleteJobTarget.role_title || deleteJobTarget.title}".` });
      setDeleteJobTarget(null);
      fetchAlerts();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveJobAlert = async () => {
    if (!jobForm.role_title || !jobForm.company_name) {
      toast({ title: "Role Title and Company Name are required", variant: "destructive" });
      return;
    }
    setSavingJob(true);
    try {
      if (editingJob) {
        await recruitersApi.updateJobField(editingJob.id, jobForm);
        toast({ title: "Job opening updated successfully" });
      } else {
        await recruitersApi.createJobAlert(jobForm);
        toast({ title: "Job created successfully" });
      }
      setJobDialogOpen(false);
      fetchAlerts();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
    setSavingJob(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Admin Job Board
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage live job postings, search, edit, reject, and delete job openings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Admin Standard Filter Card */}
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" /> Search & Filter Jobs
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {/* Search Inputs Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Job Title..."
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="relative">
                <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Company..."
                  value={searchCompany}
                  onChange={(e) => setSearchCompany(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="relative">
                <Sparkles className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Skills (React, Python)..."
                  value={searchSkills}
                  onChange={(e) => setSearchSkills(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Select Dropdown Filters Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 pt-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="applied">Applied / Open</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  {["All Locations", "United States", "Remote", "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA"].map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterWorkMode} onValueChange={setFilterWorkMode}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Work Mode" /></SelectTrigger>
                <SelectContent>
                  {["All Work Modes", "Remote", "Hybrid", "Onsite"].map((wm) => (
                    <SelectItem key={wm} value={wm}>{wm}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Employment Type" /></SelectTrigger>
                <SelectContent>
                  {["All Types", "Full-Time", "Contract", "Contract-to-Hire", "Internship", "W2", "C2C"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterVisa} onValueChange={setFilterVisa}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Visa Type" /></SelectTrigger>
                <SelectContent>
                  {["All Visa Types", "OPT", "STEM OPT", "H1B", "H1B Transfer", "USC", "Green Card", "All Work Authorization"].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sort Order" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Newest First">Newest First</SelectItem>
                  <SelectItem value="Oldest First">Oldest First</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-9 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Job Listings Panel */}
        <Card className="border border-border/60 shadow-xs rounded-2xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/40 border-b border-border/40 p-5 md:p-6 flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Globe className="h-5 w-5 text-primary" />
              Live Job Postings ({filteredJobs.length})
            </CardTitle>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-muted/80 p-1 rounded-xl gap-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "cards"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "table"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
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
                    <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse p-6 space-y-4">
                      <div className="h-8 w-1/3 bg-muted-foreground/20 rounded-lg" />
                      <div className="h-5 w-2/3 bg-muted-foreground/20 rounded-lg" />
                      <div className="h-4 w-full bg-muted-foreground/20 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <Search className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                  <p className="text-foreground font-bold text-base">No jobs matched your search.</p>
                  <p className="text-xs text-muted-foreground">Try adjusting your keywords or clearing the search filters.</p>
                  <Button onClick={handleResetFilters} size="sm" variant="outline" className="gap-1.5">
                    <X className="h-3.5 w-3.5" /> Clear Filters
                  </Button>
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
                        onEdit={handleOpenEdit}
                        onReject={handleRejectJob}
                        onDelete={(j) => setDeleteJobTarget(j)}
                      />
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <span>Show</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="px-2.5 py-1 rounded-lg border border-border bg-background font-bold text-foreground cursor-pointer focus:ring-2 focus:ring-primary"
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
                        className="px-3.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1.5 text-muted-foreground font-bold">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        className="px-3.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Table View */
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
                    className: "font-semibold text-foreground text-sm py-4",
                  },
                  {
                    header: "Role Title",
                    accessorKey: "role_title",
                    sortable: true,
                    className: "text-foreground font-bold text-sm py-4",
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
                    ) : <span className="text-muted-foreground">—</span>
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
                    ) : <span className="text-muted-foreground">—</span>
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
                    ) : <span className="text-muted-foreground">—</span>
                  },
                  {
                    header: "City",
                    accessorKey: "city",
                    sortable: true,
                    className: "py-4 text-xs font-medium text-foreground",
                    render: (job: any) => job.city || <span className="text-muted-foreground">—</span>
                  },
                  {
                    header: "State",
                    accessorKey: "state",
                    sortable: true,
                    className: "py-4 text-xs font-medium text-foreground",
                    render: (job: any) => job.state || <span className="text-muted-foreground">—</span>
                  },
                  {
                    header: "Country",
                    accessorKey: "country",
                    sortable: true,
                    className: "py-4 text-xs font-medium text-foreground",
                    render: (job: any) => job.country || <span className="text-muted-foreground">—</span>
                  },
                  {
                    header: "Salary",
                    accessorKey: "salary",
                    sortable: true,
                    className: "py-4 text-xs font-bold text-foreground",
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
                    ) : <span className="text-muted-foreground">—</span>
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
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl inline-flex items-center gap-1 transition-all text-xs font-semibold"
                        >
                          Apply Now
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ),
                    className: "py-4",
                  },
                  {
                    header: "Admin Actions",
                    className: "py-4 text-right pr-4",
                    render: (job: any) => (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleOpenEdit(job)}
                          title="Edit Job"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => handleRejectJob(job)}
                          title="Reject Job"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteJobTarget(job)}
                          title="Delete Job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* READ MORE / JOB DETAILS MODAL */}
      <Dialog open={!!activeJobDesc} onOpenChange={(open) => !open && setActiveJobDesc(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card rounded-2xl p-6 shadow-2xl border border-border/50">
          <DialogHeader className="border-b border-border/10 pb-4">
            <DialogTitle className="text-lg font-bold flex flex-col gap-1 text-left">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Job Details</span>
              <span className="text-card-foreground">{activeJobDesc?.role}</span>
              <span className="text-primary text-sm font-medium">{activeJobDesc?.company}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Job Details Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 border-b border-border/10 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Employment Type</p>
              <p className="font-semibold text-foreground">{activeJobDesc?.employment_type || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Experience Required</p>
              <p className="font-semibold text-foreground">{activeJobDesc?.experience_required || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Work Mode</p>
              <p className="font-semibold text-foreground">{activeJobDesc?.work_mode || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Location</p>
              <p className="font-semibold text-foreground">{activeJobDesc?.location || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Salary</p>
              <p className="font-semibold text-foreground">{activeJobDesc?.salary || "Not Disclosed"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Visa Eligibility</p>
              <p className="font-semibold text-foreground">{activeJobDesc?.visa_eligibility || "—"}</p>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Job Description</p>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-[45vh] overflow-y-auto pr-2">
              {activeJobDesc?.description || "No description provided."}
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
            {activeJobDesc?.job_url ? (
              <a
                href={activeJobDesc.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                Apply Link <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span />
            )}
            <Button variant="outline" onClick={() => setActiveJobDesc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT JOB DIALOG */}
      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? "Edit Job Posting" : "Create New Job Posting"}</DialogTitle>
            <DialogDescription>Fill in the details for the job alert posting.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role Title *</Label>
                <Input
                  value={jobForm.role_title}
                  onChange={(e) => setJobForm((f) => ({ ...f, role_title: e.target.value }))}
                  placeholder="e.g. Senior Java Developer"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Company Name *</Label>
                <Input
                  value={jobForm.company_name}
                  onChange={(e) => setJobForm((f) => ({ ...f, company_name: e.target.value }))}
                  placeholder="e.g. Acme Corp"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Employment Type</Label>
                <Input
                  value={jobForm.employment_type}
                  onChange={(e) => setJobForm((f) => ({ ...f, employment_type: e.target.value }))}
                  placeholder="Full-Time / Contract"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Experience Required</Label>
                <Input
                  value={jobForm.experience_required}
                  onChange={(e) => setJobForm((f) => ({ ...f, experience_required: e.target.value }))}
                  placeholder="2–5 Years"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Work Mode</Label>
                <Input
                  value={jobForm.work_mode}
                  onChange={(e) => setJobForm((f) => ({ ...f, work_mode: e.target.value }))}
                  placeholder="Remote / Hybrid"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  value={jobForm.city}
                  onChange={(e) => setJobForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="San Francisco"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">State</Label>
                <Input
                  value={jobForm.state}
                  onChange={(e) => setJobForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="CA"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Country</Label>
                <Input
                  value={jobForm.country}
                  onChange={(e) => setJobForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="United States"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Salary</Label>
                <Input
                  value={jobForm.salary}
                  onChange={(e) => setJobForm((f) => ({ ...f, salary: e.target.value }))}
                  placeholder="$120,000 / yr"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Visa Eligibility</Label>
                <Select
                  value={jobForm.visa_eligibility}
                  onValueChange={(v) => setJobForm((f) => ({ ...f, visa_eligibility: v }))}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPT">OPT</SelectItem>
                    <SelectItem value="STEM OPT">STEM OPT</SelectItem>
                    <SelectItem value="H1B">H1B</SelectItem>
                    <SelectItem value="H1B Transfer">H1B Transfer</SelectItem>
                    <SelectItem value="USC">USC</SelectItem>
                    <SelectItem value="Green Card">Green Card</SelectItem>
                    <SelectItem value="All Work Authorization">All Work Authorization</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Job URL / Application Link</Label>
              <Input
                value={jobForm.job_url}
                onChange={(e) => setJobForm((f) => ({ ...f, job_url: e.target.value }))}
                placeholder="https://company.careers/job/123"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Job Description</Label>
              <Textarea
                rows={4}
                value={jobForm.job_description}
                onChange={(e) => setJobForm((f) => ({ ...f, job_description: e.target.value }))}
                placeholder="Enter job description..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setJobDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveJobAlert} disabled={savingJob}>
              {savingJob ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!deleteJobTarget} onOpenChange={(o) => !o && setDeleteJobTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Posting?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteJobTarget?.role_title || deleteJobTarget?.company_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-rose-600 text-white hover:bg-rose-700">
              Delete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminJobBoard;
