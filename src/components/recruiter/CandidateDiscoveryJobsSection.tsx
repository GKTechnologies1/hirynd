import React, { useState, useEffect, useCallback, useMemo } from "react";
import { recruiterJobDiscoveryApi, recruitersApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, cn } from "@/lib/utils";
import { VisaGradeBadge } from "@/components/visa/VisaGradeBadge";
import { JobRestrictionBadges } from "@/components/job/JobRestrictionBadges";
import {
  Search, ExternalLink, RefreshCw, Briefcase, Building, MapPin,
  Eye, Copy, ChevronLeft, ChevronRight, Award,
  ShieldCheck, Check, UserCheck, Compass, X, LayoutGrid, Table,
  Clock, DollarSign, Home, Loader2
} from "lucide-react";

export const JOB_STATUSES = [
  "Applied",
  "Screening",
  "Screening Scheduled",
  "Interview",
  "Interview Scheduled",
  "Offer",
  "Rejected",
  "No Response",
];

const safeUrl = (url?: string): string => {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "#";
};

interface CandidateDiscoveryJobsSectionProps {
  candidateId: string;
  candidate: any;
  roles?: any[];
  jobPostings?: any[];
  resumes?: any[];
  alwaysShowDefaults?: any;
  onUpdateJobStatus: (jobId: string, status: string) => Promise<void>;
  onRefreshApplications: () => Promise<void> | void;
  onMovedToPipeline?: (createdEntries?: any) => void;
  onClose?: () => void;
}

export const CandidateDiscoveryJobsSection = ({
  candidateId,
  candidate,
  roles = [],
  jobPostings = [],
  resumes = [],
  alwaysShowDefaults = {},
  onUpdateJobStatus,
  onRefreshApplications,
  onMovedToPipeline,
  onClose,
}: CandidateDiscoveryJobsSectionProps) => {
  const { toast } = useToast();

  // View Mode: Cards vs Table (same as JobAlert.tsx)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedVisaGrade, setSelectedVisaGrade] = useState("all");
  const [minScore, setMinScore] = useState<string>("all");
  const [h1bOnly, setH1bOnly] = useState<boolean>(false);
  const [isRemote, setIsRemote] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState("-created_at");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Available portal sources from filters API
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  // Jobs data
  const [jobs, setJobs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  // Detail Modal
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  // Fetch filter options (portal sources, roles)
  useEffect(() => {
    let isMounted = true;
    recruiterJobDiscoveryApi.filters()
      .then(res => {
        if (!isMounted) return;
        setAvailableSources(res.data?.sources || []);
      })
      .catch(err => {
        console.warn("Failed to load discovery filters:", err);
      });
    return () => { isMounted = false; };
  }, []);

  // Fetch jobs for this candidate
  const fetchJobs = useCallback(async () => {
    if (!candidateId) return;
    setLoading(true);
    try {
      const params: any = {
        candidate_id: candidateId,
        page: currentPage,
        page_size: pageSize,
        ordering: sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedRole !== "all") params.role = selectedRole;
      if (selectedSource !== "all") params.source = selectedSource;
      if (selectedVisaGrade !== "all") params.visa_grade = selectedVisaGrade;
      if (minScore !== "all") params.min_score = Number(minScore);
      if (h1bOnly) params.h1b_only = true;
      if (isRemote !== "all") params.is_remote = isRemote === "true";

      const res = await recruiterJobDiscoveryApi.jobs(params);
      setJobs(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
      setTotalPages(res.data?.num_pages || 1);
    } catch (err: any) {
      toast({
        title: "Error loading discovery jobs",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    candidateId, currentPage, pageSize, sortOrder, search,
    selectedRole, selectedSource, selectedVisaGrade, minScore,
    h1bOnly, isRemote, toast
  ]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Find if a job has an existing application in jobPostings
  const findExistingApplication = useCallback((job: any) => {
    const jobUrl = (job.job_url || "").trim().toLowerCase();
    const jobTitle = (job.title || "").trim().toLowerCase();
    const company = (job.company_name || "").trim().toLowerCase();

    return jobPostings.find(app => {
      const appUrl = (app.job_url || "").trim().toLowerCase();
      if (jobUrl && appUrl && jobUrl === appUrl) return true;
      const appRole = (app.role_title || "").trim().toLowerCase();
      const appCompany = (app.company_name || "").trim().toLowerCase();
      if (jobTitle && company && appRole === jobTitle && appCompany === company) return true;
      return false;
    });
  }, [jobPostings]);

  // Automatically submit application and move it to the pipeline
  const handleApplyDirectly = async (job: any, statusVal: string = "applied") => {
    setUpdatingJobId(job.id);
    const existingApp = findExistingApplication(job);

    try {
      let createdEntries: any = null;
      if (existingApp) {
        await onUpdateJobStatus(existingApp.id, statusVal);
        toast({
          title: "Application Status Updated",
          description: `Application for ${job.company_name} status updated to ${statusVal.replace(/_/g, " ")}.`,
        });
      } else {
        const resumeUsed = (resumes && resumes.length > 0 && resumes[0].url)
          ? resumes[0].url
          : (alwaysShowDefaults?.resume_used || "Standard");

        const rawSalary = job.salary_raw || (job.salary_min ? `$${Number(job.salary_min).toLocaleString()}` : (alwaysShowDefaults?.salary || "Not Disclosed"));

        const cleanUrl = (job.job_url || "").trim();
        const validJobUrl = cleanUrl
          ? (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") ? cleanUrl : `https://${cleanUrl}`)
          : "";

        const cleanCompany = (job.company_name || "Company").trim().slice(0, 255);
        const cleanTitle = (job.title || job.target_role || "Job Opening").trim().slice(0, 255);
        const cleanDesc = (job.job_description || cleanTitle).trim();

        const res = await recruitersApi.submitJobApplications(candidateId, {
          job_links: [{
            company_name: cleanCompany,
            role_title: cleanTitle,
            job_url: validJobUrl,
            job_description: cleanDesc,
            resume_used: resumeUsed,
            status: statusVal.toLowerCase().replace(/ /g, "_"),
            employment_type: job.employment_type || alwaysShowDefaults?.employment_type || "Full-Time",
            experience_required: job.experience_level || alwaysShowDefaults?.experience_required || "0–2 Years",
            work_mode: job.is_remote ? "Remote" : (alwaysShowDefaults?.work_mode || "Onsite"),
            city: job.is_remote ? undefined : (job.city || alwaysShowDefaults?.city || undefined),
            state: job.is_remote ? undefined : (job.state_code || job.state || alwaysShowDefaults?.state || undefined),
            country: job.country || alwaysShowDefaults?.country || "United States",
            salary: rawSalary,
            visa_eligibility: alwaysShowDefaults?.visa_eligibility || (job.h1b_sponsor ? "H1B" : "All Work Authorization"),
          }]
        });

        createdEntries = res.data;
        toast({
          title: "Moved to Submission Pipeline",
          description: `${cleanTitle} at ${cleanCompany} has been moved to the submission pipeline.`,
        });
      }

      // Remove the job from the current discovery list so it visibly MOVES to the pipeline
      setJobs(prev => prev.filter(j => j.id !== job.id));
      setTotalCount(prev => Math.max(0, prev - 1));

      // Close details modal if open
      if (selectedJob && selectedJob.id === job.id) {
        setSelectedJob(null);
      }

      // Notify parent to add to pipeline table and scroll smoothly down to it
      if (onMovedToPipeline) {
        onMovedToPipeline(createdEntries);
      } else {
        await onRefreshApplications();
      }
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleOpenDetail = async (jobId: string) => {
    setLoadingDetail(true);
    setCopiedUrl(false);
    try {
      const res = await recruiterJobDiscoveryApi.jobDetail(jobId);
      setSelectedJob(res.data);
    } catch (err: any) {
      toast({
        title: "Failed to load job details",
        description: err.response?.data?.error || "Access restricted.",
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCopyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    toast({ title: "Job link copied to clipboard!" });
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyDescription = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
    toast({ title: "Copied", description: "Job description copied to clipboard." });
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedRole("all");
    setSelectedSource("all");
    setSelectedVisaGrade("all");
    setMinScore("all");
    setH1bOnly(false);
    setIsRemote("all");
    setSortOrder("-created_at");
    setCurrentPage(1);
  };

  const candidateName = candidate?.profile?.full_name || candidate?.full_name || "Candidate";

  // Confirmed role options
  const roleOptions = useMemo(() => {
    const list: string[] = [];
    roles.forEach(r => {
      const title = r.role_title || r.title || r.name;
      if (title && !list.includes(title)) list.push(title);
    });
    return list;
  }, [roles]);

  return (
    <Card className="border-none shadow-sm bg-card/60">
      <CardHeader className="pb-3 px-6 pt-5 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              Job Discovery for {candidateName}
              <span className="text-[11px] font-medium text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">
                {totalCount} Opportunities
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalized opportunities dynamically matched to {candidateName}&apos;s confirmed roles and visa eligibility.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher: Cards vs Table (same as JobAlert.tsx) */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "cards"
                    ? "bg-background text-primary shadow-xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-background text-primary shadow-xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table className="h-3.5 w-3.5" />
                Table
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchJobs}
              disabled={loading}
              className="h-8 text-xs font-medium"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Close Discovery Jobs"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Filters Toolbar */}
        <div className="px-6 pt-4 pb-3 border-b border-border/30 bg-muted/5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Title, company, keywords..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setCurrentPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Candidate Role */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Role</Label>
              <Select value={selectedRole} onValueChange={(val) => { setSelectedRole(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full">
                  <SelectValue placeholder="All Candidate Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Candidate Roles</SelectItem>
                  {roleOptions.map((r, i) => (
                    <SelectItem key={i} value={r} className="text-xs">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visa Grade */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visa Grade</Label>
              <Select value={selectedVisaGrade} onValueChange={(val) => { setSelectedVisaGrade(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Grades</SelectItem>
                  <SelectItem value="A" className="text-xs">Grade A (Score ≥ 85)</SelectItem>
                  <SelectItem value="B" className="text-xs">Grade B (Score 70–84)</SelectItem>
                  <SelectItem value="C" className="text-xs">Grade C (Score 50–69)</SelectItem>
                  <SelectItem value="D" className="text-xs">Grade D (Score 30–49)</SelectItem>
                  <SelectItem value="E,F" className="text-xs">Grade E/F (&lt; 30)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Portal Source */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Portal Source</Label>
              <Select value={selectedSource} onValueChange={(val) => { setSelectedSource(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full">
                  <SelectValue placeholder="All Portals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Portals</SelectItem>
                  {availableSources.map((s, i) => (
                    <SelectItem key={i} value={s} className="text-xs capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sub Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/30 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Min Visa Score */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-medium">Min Score:</span>
                <Select value={minScore} onValueChange={(v) => { setMinScore(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-24 h-7 text-[10px] bg-muted/30">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Any</SelectItem>
                    <SelectItem value="85" className="text-xs">85+ (Grade A)</SelectItem>
                    <SelectItem value="70" className="text-xs">70+ (Grade B+)</SelectItem>
                    <SelectItem value="50" className="text-xs">50+ (Moderate)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* H1B Sponsor Only */}
              <Button
                variant={h1bOnly ? "default" : "outline"}
                size="sm"
                onClick={() => { setH1bOnly(!h1bOnly); setCurrentPage(1); }}
                className={cn("h-7 text-[10px] rounded-lg px-2.5", h1bOnly ? "bg-primary text-primary-foreground font-bold" : "")}
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                H1B Sponsor Only
              </Button>

              {/* Remote Only */}
              <Button
                variant={isRemote === "true" ? "default" : "outline"}
                size="sm"
                onClick={() => { setIsRemote(isRemote === "true" ? "all" : "true"); setCurrentPage(1); }}
                className={cn("h-7 text-[10px] rounded-lg px-2.5", isRemote === "true" ? "bg-primary text-primary-foreground font-bold" : "")}
              >
                Remote Only
              </Button>
            </div>

            {/* Sorting & Clear */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-36 h-7 text-[10px] bg-muted/30">
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_at" className="text-xs">Newest Scraped</SelectItem>
                  <SelectItem value="-visa_friendly_score" className="text-xs">Highest Visa Score</SelectItem>
                  <SelectItem value="-h1b_approvals" className="text-xs">Most H1B Approvals</SelectItem>
                  <SelectItem value="-date_posted" className="text-xs">Newest Posted</SelectItem>
                  <SelectItem value="title" className="text-xs">Job Title (A-Z)</SelectItem>
                  <SelectItem value="company_name" className="text-xs">Company (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* ===================== VIEW MODE 1: CARDS VIEW ===================== */}
        {viewMode === "cards" ? (
          <div className="p-4 md:p-6 space-y-4">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                Loading matching discovered opportunities...
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <Briefcase className="h-10 w-10 mx-auto opacity-30" />
                <p className="font-bold text-sm text-foreground">No discovered opportunities match {candidateName}&apos;s profile.</p>
                <p className="text-xs">Try adjusting your keywords or clearing the filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {jobs.map((job) => {
                  const existingApp = findExistingApplication(job);
                  const currentStatus = existingApp
                    ? (existingApp.application_status || existingApp.status || "applied").toLowerCase().replace(/ /g, "_")
                    : "";
                  const isUpdating = updatingJobId === job.id;
                  const isApplied = !!existingApp;
                  const companyName = job.company_name || "Company";
                  const roleTitle = job.title || "Job Opportunity";
                  const postedDate = job.date_posted ? formatDate(job.date_posted) : "Recent";
                  const location = job.is_remote
                    ? "Remote"
                    : (job.city ? `${job.city}, ${job.state_code || job.state}` : (job.location_raw || "USA"));
                  const salary = job.salary_raw || (job.salary_min ? `$${Number(job.salary_min).toLocaleString()}` : "Not Disclosed");
                  const salary_type = job.salary_period ? String(job.salary_period).replace(/^_/, "").toLowerCase() : null;

                  return (
                    <div
                      key={job.id}
                      className="bg-card border border-border/70 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all space-y-3 group relative flex flex-col justify-between"
                    >
                      {/* Top Header Row */}
                      <div className="flex items-start gap-3">
                        {/* Company Logo Container */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white flex items-center justify-center font-extrabold text-base shadow-2xs shrink-0 mt-0.5">
                          {companyName.charAt(0).toUpperCase()}
                        </div>

                        {/* Title and Company Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold mb-1">
                            <VisaGradeBadge
                              grade={job.visa_grade}
                              score={job.visa_friendly_score}
                              visaMatched={job.visa_matched}
                              matchConfidence={job.company_match_confidence}
                              filingsCount={job.h1b_filings_recent}
                              size="sm"
                            />
                            <span className="bg-blue-500/10 text-blue-700 border border-blue-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {postedDate}
                            </span>
                            <span className="bg-purple-500/10 text-purple-700 border border-purple-500/20 px-1.5 py-0.5 rounded-md capitalize">
                              {job.source_portal || "Web"}
                            </span>
                            {job.detected_restrictions && job.detected_restrictions.length > 0 && (
                              <JobRestrictionBadges restrictions={job.detected_restrictions} compact />
                            )}
                          </div>

                          <h4
                            onClick={() => handleOpenDetail(job.id)}
                            className="text-sm font-extrabold text-foreground hover:text-primary transition-colors cursor-pointer leading-snug truncate"
                            title={roleTitle}
                          >
                            {roleTitle}
                          </h4>

                          <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                            <span className="font-bold text-foreground/80">{companyName}</span>
                            {job.target_role && (
                              <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                {job.target_role}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground font-medium">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{location}</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate font-semibold text-foreground/90">
                              {job.is_remote ? "Remote" : (job.employment_type || "Full-Time")}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <DollarSign className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span className="font-bold text-blue-600 truncate">{salary}</span>
                            {salary_type && salary !== "Not Disclosed" && (
                              <span className="font-semibold text-blue-600/80 text-[11px] truncate">
                                / {salary_type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 truncate text-[11px]">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              {job.h1b_filings_recent > 0 ? `${job.h1b_filings_recent.toLocaleString()} H1B filings` : "Visa Intelligence"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions Row */}
                      <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap">
                        {/* Status Dropdown */}
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={currentStatus || "__NONE__"}
                            onValueChange={(val) => handleApplyDirectly(job, val)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className={cn(
                              "w-32 h-7 text-[10px] font-bold border-none transition-colors",
                              isApplied
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-muted/50 text-muted-foreground"
                            )}>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__NONE__" className="text-xs text-muted-foreground">
                                -- Not Applied --
                              </SelectItem>
                              {JOB_STATUSES.map(s => (
                                <SelectItem key={s} value={s.toLowerCase().replace(/ /g, "_")} className="text-xs">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Right Buttons: Applied & View */}
                        <div className="flex items-center gap-1.5">
                          {/* Applied Button: Automatically adds to pipeline */}
                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <Check className="h-3.5 w-3.5" />
                              Applied
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleApplyDirectly(job, "applied")}
                              disabled={isUpdating}
                              className="h-7 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                              title="Automatically add this job to the application submission pipeline"
                            >
                              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Applied
                            </Button>
                          )}

                          {/* Read Details */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(job.id)}
                            className="h-7 px-2 text-xs font-medium"
                          >
                            <Eye className="h-3 w-3 mr-1 text-muted-foreground" />
                            Details
                          </Button>

                          {/* External Job Link */}
                          {job.job_url && (
                            <a
                              href={safeUrl(job.job_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                              title="Open original job listing"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ===================== VIEW MODE 2: TABLE VIEW ===================== */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/40 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Opportunity</th>
                  <th className="py-3 px-3">Candidate Match</th>
                  <th className="py-3 px-3">Visa Intelligence</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Salary</th>
                  <th className="py-3 px-3">Portal</th>
                  <th className="py-3 px-3">Posted</th>
                  <th className="py-3 px-4">Application Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading matching discovered opportunities...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No discovered opportunities match {candidateName}&apos;s profile with the current filters.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => {
                    const existingApp = findExistingApplication(job);
                    const currentStatus = existingApp
                      ? (existingApp.application_status || existingApp.status || "applied").toLowerCase().replace(/ /g, "_")
                      : "";
                    const isUpdating = updatingJobId === job.id;
                    const isApplied = !!existingApp;

                    return (
                      <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                        {/* Opportunity: Title & Company */}
                        <td className="py-3 px-4 max-w-[220px]">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(job.id)}
                            className="font-bold text-foreground hover:text-primary hover:underline text-left block truncate text-xs cursor-pointer"
                            title={job.title}
                          >
                            {job.title}
                          </button>
                          <span className="text-muted-foreground text-[11px] block truncate mt-0.5" title={job.company_name}>
                            {job.company_name}
                          </span>
                        </td>

                        {/* Candidate Match Badges */}
                        <td className="py-3 px-3 max-w-[160px]">
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[10px] font-medium truncate max-w-[150px]"
                          >
                            {job.target_role || "Role Match"}
                          </Badge>
                        </td>

                        {/* Visa Intelligence */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <VisaGradeBadge
                              grade={job.visa_grade}
                              score={job.visa_friendly_score}
                              visaMatched={job.visa_matched}
                              matchConfidence={job.company_match_confidence}
                              filingsCount={job.h1b_filings_recent}
                            />
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              {job.h1b_filings_recent > 0 && (
                                <span>{job.h1b_filings_recent.toLocaleString()} filings</span>
                              )}
                              {job.everify_enrolled && (
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 py-0 px-1 text-[9px]">
                                  E-Verify
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-3 text-muted-foreground max-w-[130px] truncate whitespace-nowrap">
                          {job.is_remote ? (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 text-[10px] py-0 px-1.5">
                              Remote
                            </Badge>
                          ) : (
                            <span>{job.city ? `${job.city}, ${job.state_code || job.state}` : (job.location_raw || "USA")}</span>
                          )}
                        </td>

                        {/* Salary */}
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap font-medium">
                          {job.salary_raw || (job.salary_min ? `$${Number(job.salary_min).toLocaleString()}` : "Not Disclosed")}
                        </td>

                        {/* Portal */}
                        <td className="py-3 px-3">
                          <span className="capitalize font-semibold text-foreground text-[11px]">
                            {job.source_portal || "Web"}
                          </span>
                        </td>

                        {/* Posted */}
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap text-[11px]">
                          {job.date_posted ? formatDate(job.date_posted) : "Recent"}
                        </td>

                        {/* Application Status (Same as existing Submit Job Application) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Select
                            value={currentStatus || "__NONE__"}
                            onValueChange={(val) => handleApplyDirectly(job, val)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className={cn(
                              "w-36 h-8 text-[11px] font-bold border-none transition-colors",
                              isApplied
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}>
                              <SelectValue placeholder="Update status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__NONE__" className="text-xs text-muted-foreground">
                                -- Not Applied --
                              </SelectItem>
                              {JOB_STATUSES.map(s => (
                                <SelectItem key={s} value={s.toLowerCase().replace(/ /g, "_")} className="text-xs font-medium">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Applied Button: Automatically adds all details to submission pipeline */}
                            {isApplied ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <Check className="h-3.5 w-3.5" />
                                Applied
                              </span>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleApplyDirectly(job, "applied")}
                                disabled={isUpdating}
                                className="h-7 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                                title="Automatically add this job to the application submission pipeline"
                              >
                                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                Applied
                              </Button>
                            )}

                            {job.job_url && (
                              <a
                                href={safeUrl(job.job_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                title="Open original job listing"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetail(job.id)}
                              className="h-7 px-2 text-[10px] font-medium"
                            >
                              <Eye className="h-3 w-3 mr-1 text-muted-foreground" />
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-border/40 text-xs text-muted-foreground">
          <div>
            Showing {jobs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} discovered opportunities
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="h-7 px-2.5 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span className="px-2 text-xs font-medium">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="h-7 px-2.5 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Recruiter Job Detail Modal */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <VisaGradeBadge
                    grade={selectedJob.visa_grade}
                    score={selectedJob.visa_friendly_score}
                    visaMatched={selectedJob.visa_matched}
                    matchConfidence={selectedJob.company_match_confidence}
                    filingsCount={selectedJob.h1b_filings_recent}
                  />
                  <Badge variant="outline" className="text-xs capitalize font-normal">
                    {selectedJob.source_portal || "Web"}
                  </Badge>
                  {selectedJob.is_remote && (
                    <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-700">
                      Remote
                    </Badge>
                  )}
                  {selectedJob.detected_restrictions && selectedJob.detected_restrictions.length > 0 && (
                    <JobRestrictionBadges restrictions={selectedJob.detected_restrictions} compact={false} />
                  )}
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {selectedJob.title}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 pt-0.5">
                  <Building className="h-3.5 w-3.5" />
                  {selectedJob.company_name}
                  <span className="mx-1">•</span>
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedJob.city ? `${selectedJob.city}, ${selectedJob.state_code || selectedJob.state}` : (selectedJob.location_raw || "USA")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Candidate Context Banner */}
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-300 text-xs block">
                      Targeted for {candidateName}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Matched Role: {selectedJob.target_role || "Confirmed Role"}
                    </span>
                  </div>

                  {/* Quick status update from modal */}
                  {(() => {
                    const existingApp = findExistingApplication(selectedJob);
                    const currentStatus = existingApp
                      ? (existingApp.application_status || existingApp.status || "applied").toLowerCase().replace(/ /g, "_")
                      : "";
                    const isApplied = !!existingApp;

                    return (
                      <div className="flex items-center gap-2">
                        {isApplied ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <Check className="h-3 w-3" />
                            Applied
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleApplyDirectly(selectedJob, "applied")}
                            disabled={updatingJobId === selectedJob.id}
                            className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            Applied
                          </Button>
                        )}
                        <Select
                          value={currentStatus || "__NONE__"}
                          onValueChange={(val) => handleApplyDirectly(selectedJob, val)}
                        >
                          <SelectTrigger className="w-32 h-8 text-[11px] font-bold bg-background">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__NONE__" className="text-xs text-muted-foreground">
                              -- Not Applied --
                            </SelectItem>
                            {JOB_STATUSES.map(s => (
                              <SelectItem key={s} value={s.toLowerCase().replace(/ /g, "_")} className="text-xs">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
                </div>

                {/* External Application Link Bar */}
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-0.5 w-full sm:w-auto">
                    <span className="font-semibold text-foreground text-xs block">Job Application URL:</span>
                    <span className="text-muted-foreground text-[11px] block truncate max-w-sm">
                      {selectedJob.job_url || "Direct portal listing"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {selectedJob.job_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(selectedJob.job_url)}
                        className="h-8 text-xs px-2.5"
                      >
                        {copiedUrl ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                        {copiedUrl ? "Copied" : "Copy"}
                      </Button>
                    )}
                    {selectedJob.job_url ? (
                      <a
                        href={safeUrl(selectedJob.job_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md font-medium text-xs h-8 px-3.5 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Apply on {selectedJob.source_portal || "Portal"}
                        <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                      </a>
                    ) : (
                      <Button disabled size="sm" className="h-8 text-xs">Link Unavailable</Button>
                    )}
                  </div>
                </div>

                {/* Visa Intelligence Card */}
                <div className="p-3.5 bg-gradient-to-br from-card to-primary/5 rounded-lg border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground text-xs">Employer Visa Sponsorship</span>
                    </div>
                    <VisaGradeBadge
                      grade={selectedJob.visa_grade}
                      score={selectedJob.visa_friendly_score}
                      visaMatched={selectedJob.visa_matched}
                      matchConfidence={selectedJob.company_match_confidence}
                      filingsCount={selectedJob.h1b_filings_recent}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                    <div className="bg-background p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[10px]">H1B Total Filings</span>
                      <span className="font-bold text-foreground text-sm">
                        {(selectedJob.h1b_filings_recent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-background p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[10px]">Approvals / Denials</span>
                      <span className="font-bold text-foreground text-sm">
                        {(selectedJob.h1b_approvals || 0).toLocaleString()} / {(selectedJob.h1b_denials || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-background p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[10px]">Avg H1B Salary</span>
                      <span className="font-bold text-foreground text-sm">
                        {selectedJob.h1b_avg_salary ? `$${selectedJob.h1b_avg_salary.toLocaleString()}` : "N/A"}
                      </span>
                    </div>
                    <div className="bg-background p-2 rounded border border-border/50">
                      <span className="text-muted-foreground block text-[10px]">PERM Green Card</span>
                      <span className="font-bold text-foreground text-sm">
                        {selectedJob.green_card_sponsor ? "Yes (Sponsor)" : `${selectedJob.perm_filings || 0} filings`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold text-foreground">
                      Job Description:
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyDescription(selectedJob.job_description)}
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {copiedDesc ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedDesc ? "Copied" : "Copy Description"}
                    </Button>
                  </div>
                  <div className="p-3 bg-muted/20 border border-border/50 rounded-md max-h-56 overflow-y-auto whitespace-pre-wrap text-muted-foreground text-xs leading-relaxed">
                    {selectedJob.job_description || "No full description text was captured for this listing."}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
                {(() => {
                  const existingApp = findExistingApplication(selectedJob);
                  if (existingApp) {
                    return (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300">
                        <Check className="h-3.5 w-3.5" />
                        Already in Pipeline
                      </span>
                    );
                  }
                  return (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        handleApplyDirectly(selectedJob, "applied");
                        setSelectedJob(null);
                      }}
                      className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Applied (Add to Pipeline)
                    </Button>
                  );
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedJob(null)}
                  className="h-8 text-xs"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CandidateDiscoveryJobsSection;
