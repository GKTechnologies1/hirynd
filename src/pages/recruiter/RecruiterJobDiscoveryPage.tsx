import React, { useState, useEffect, useCallback } from "react";
import { recruiterJobDiscoveryApi } from "@/services/api";
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
import { formatDate } from "@/lib/utils";
import { VisaGradeBadge } from "@/components/visa/VisaGradeBadge";
import { JobRestrictionBadges } from "@/components/job/JobRestrictionBadges";
import {
  Search, ExternalLink, RefreshCw, Briefcase, Building, MapPin,
  Calendar, Eye, Copy, ChevronLeft, ChevronRight, Award,
  ShieldCheck, Users, Check, Sparkles, UserCheck, AlertTriangle
} from "lucide-react";

const safeUrl = (url?: string): string => {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "#";
};

export const RecruiterJobDiscoveryPage = () => {
  const { toast } = useToast();

  // Statistics
  const [stats, setStats] = useState<any>({
    total_matching_jobs: 0,
    matching_today: 0,
    matching_week: 0,
    assigned_candidates_count: 0,
    by_candidate: [],
    by_role: [],
    by_grade: [],
  });

  // Filter options from recruiter's actual scope
  const [filterOptions, setFilterOptions] = useState<{
    candidates: { id: string; name: string; roles: string[] }[];
    roles: string[];
    sources: string[];
    locations: string[];
    visa_grades: string[];
  }>({
    candidates: [],
    roles: [],
    sources: [],
    locations: [],
    visa_grades: ["A", "B", "C", "D", "E", "F"],
  });

  // Active query filters
  const [search, setSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedVisaGrade, setSelectedVisaGrade] = useState("all");
  const [minScore, setMinScore] = useState<string>("all");
  const [h1bOnly, setH1bOnly] = useState<boolean>(false);
  const [isRemote, setIsRemote] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState("-created_at");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data states
  const [jobs, setJobs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasCandidates, setHasCandidates] = useState(true);

  // Selected job for detail modal
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Mark as Applied modal & state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [targetJobForApply, setTargetJobForApply] = useState<any>(null);
  const [selectedCandidateForApply, setSelectedCandidateForApply] = useState<string>("");
  const [applyNotes, setApplyNotes] = useState<string>("");
  const [submittingApply, setSubmittingApply] = useState<boolean>(false);

  const handleOpenApplyModal = (job: any) => {
    setTargetJobForApply(job);
    setApplyNotes("");

    // Determine default candidate
    if (selectedCandidate !== "all") {
      setSelectedCandidateForApply(selectedCandidate);
    } else {
      const unapplied = (job.matching_candidates || []).find((c: any) => !c.has_applied);
      if (unapplied) {
        setSelectedCandidateForApply(unapplied.id);
      } else if (job.matching_candidates && job.matching_candidates.length > 0) {
        setSelectedCandidateForApply(job.matching_candidates[0].id);
      } else if (filterOptions.candidates.length > 0) {
        setSelectedCandidateForApply(filterOptions.candidates[0].id);
      }
    }
    setApplyModalOpen(true);
  };

  const handleConfirmMarkApplied = async () => {
    if (!targetJobForApply || !selectedCandidateForApply) {
      toast({
        title: "Selection Required",
        description: "Please select an assigned candidate to mark as applied.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingApply(true);
    try {
      const res = await recruiterJobDiscoveryApi.markApplied(targetJobForApply.id, {
        candidate_id: selectedCandidateForApply,
        notes: applyNotes,
      });

      toast({
        title: "Application Tracked",
        description: res.data?.message || "Job marked as Applied successfully.",
      });

      // Update candidate application status live in local state
      const candIdStr = String(selectedCandidateForApply);
      const appliedDate = res.data?.applied_date || new Date().toISOString().split("T")[0];

      setJobs((prevJobs) =>
        prevJobs
          .map((j) => {
            if (j.id === targetJobForApply.id) {
              const updatedCands = (j.matching_candidates || []).map((mc: any) => {
                if (String(mc.id) === candIdStr) {
                  return {
                    ...mc,
                    has_applied: true,
                    application_status: "applied",
                    applied_date: appliedDate,
                  };
                }
                return mc;
              });
              const allApplied = updatedCands.length > 0 && updatedCands.every((c: any) => c.has_applied);
              return {
                ...j,
                matching_candidates: updatedCands,
                has_applied_any: true,
                all_applied: allApplied,
              };
            }
            return j;
          })
          // If viewing specific candidate, remove job immediately from their unapplied list
          .filter((j) => {
            if (selectedCandidate !== "all" && selectedCandidate === candIdStr && j.id === targetJobForApply.id) {
              return false;
            }
            return true;
          })
      );

      // Also update selectedJob if open
      if (selectedJob && selectedJob.id === targetJobForApply.id) {
        setSelectedJob((prev: any) => ({
          ...prev,
          matching_candidates: (prev.matching_candidates || []).map((mc: any) =>
            String(mc.id) === candIdStr ? { ...mc, has_applied: true, application_status: "applied" } : mc
          ),
          has_applied_any: true,
        }));
      }

      setApplyModalOpen(false);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || "Failed to mark job as applied.";
      toast({
        title: "Action Failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setSubmittingApply(false);
    }
  };

  // Fetch recruiter statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await recruiterJobDiscoveryApi.statistics();
      setStats(res.data);
    } catch (err) {
      console.warn("Failed to load recruiter stats:", err);
    }
  }, []);

  // Fetch recruiter filters
  const fetchFilters = useCallback(async () => {
    try {
      const res = await recruiterJobDiscoveryApi.filters();
      setFilterOptions({
        candidates: res.data?.candidates || [],
        roles: res.data?.roles || [],
        sources: res.data?.sources || [],
        locations: res.data?.locations || [],
        visa_grades: res.data?.visa_grades || ["A", "B", "C", "D", "E", "F"],
      });
      if (!res.data?.candidates || res.data.candidates.length === 0) {
        setHasCandidates(false);
      } else {
        setHasCandidates(true);
      }
    } catch (err) {
      console.warn("Failed to load recruiter filters:", err);
    }
  }, []);

  // Fetch matching jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: pageSize,
        ordering: sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedCandidate !== "all") params.candidate_id = selectedCandidate;
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
      if (res.data?.has_candidates !== undefined) {
        setHasCandidates(res.data.has_candidates);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching matching jobs",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    currentPage, pageSize, sortOrder, search, selectedCandidate,
    selectedRole, selectedSource, selectedVisaGrade, minScore, h1bOnly, isRemote, toast
  ]);

  useEffect(() => {
    fetchStats();
    fetchFilters();
  }, [fetchStats, fetchFilters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCandidate("all");
    setSelectedRole("all");
    setSelectedSource("all");
    setSelectedVisaGrade("all");
    setMinScore("all");
    setH1bOnly(false);
    setIsRemote("all");
    setSortOrder("-created_at");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Recruiter Job Discovery
          </h1>
          <p className="text-sm text-slate-500">
            Personalized opportunities dynamically matched to your assigned candidates and confirmed roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchStats(); fetchJobs(); }}
            disabled={loading}
            className="h-9 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Matching Opportunities</span>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_matching_jobs || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-blue-600 font-medium">Matching Added Today</span>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{stats.matching_today || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-emerald-600 font-medium">Assigned Candidates</span>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.assigned_candidates_count || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-purple-600 font-medium">Visa Friendly (Grade A/B)</span>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">
            {(stats.by_grade || [])
              .filter((g: any) => g.visa_grade === "A" || g.visa_grade === "B")
              .reduce((acc: number, curr: any) => acc + curr.count, 0)}
          </p>
        </Card>
      </div>

      {/* Filter and Candidate Scope Toolbar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label className="text-xs font-semibold text-slate-600 block mb-1">Search Keywords</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Job title, company, skills..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 text-sm"
                />
              </div>
            </div>

            {/* Filter by Candidate */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 block mb-1">Assigned Candidate</Label>
              <Select value={selectedCandidate} onValueChange={(val) => { setSelectedCandidate(val); setCurrentPage(1); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Candidates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All My Candidates</SelectItem>
                  {filterOptions.candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.roles.length} roles)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Candidate Role */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 block mb-1">Candidate Role</Label>
              <Select value={selectedRole} onValueChange={(val) => { setSelectedRole(val); setCurrentPage(1); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Candidate Roles</SelectItem>
                  {filterOptions.roles.map((r, i) => (
                    <SelectItem key={i} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visa Grade Filter */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 block mb-1">Visa Grade</Label>
              <Select value={selectedVisaGrade} onValueChange={(val) => { setSelectedVisaGrade(val); setCurrentPage(1); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="A">Grade A (Score ≥ 85)</SelectItem>
                  <SelectItem value="B">Grade B (Score 70-84)</SelectItem>
                  <SelectItem value="C">Grade C (Score 50-69)</SelectItem>
                  <SelectItem value="D">Grade D (Score 30-49)</SelectItem>
                  <SelectItem value="E,F">Grade E/F (&lt; 30)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sub Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Portal Source Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Portal:</span>
                <Select value={selectedSource} onValueChange={(val) => { setSelectedSource(val); setCurrentPage(1); }}>
                  <SelectTrigger className="w-28 h-7 text-xs">
                    <SelectValue placeholder="All Portals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Portals</SelectItem>
                    {filterOptions.sources.map((s, i) => (
                      <SelectItem key={i} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Visa Score Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Min Score:</span>
                <Select value={minScore} onValueChange={(v) => { setMinScore(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Score</SelectItem>
                    <SelectItem value="85">85+ (Grade A)</SelectItem>
                    <SelectItem value="70">70+ (Grade B+)</SelectItem>
                    <SelectItem value="50">50+ (Moderate)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* H1B Sponsor Only Toggle */}
              <Button
                variant={h1bOnly ? "default" : "outline"}
                size="sm"
                onClick={() => { setH1bOnly(!h1bOnly); setCurrentPage(1); }}
                className="h-7 text-xs rounded-full px-3"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                H1B Sponsor Only
              </Button>

              {/* Remote Toggle */}
              <Button
                variant={isRemote === "true" ? "default" : "outline"}
                size="sm"
                onClick={() => { setIsRemote(isRemote === "true" ? "all" : "true"); setCurrentPage(1); }}
                className="h-7 text-xs rounded-full px-3"
              >
                Remote Only
              </Button>
            </div>

            {/* Sorting & Clear */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Sort:</span>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-40 h-7 text-xs">
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_at">Newest Scraped</SelectItem>
                  <SelectItem value="-visa_friendly_score">Highest Visa Score</SelectItem>
                  <SelectItem value="-h1b_approvals">Most H1B Approvals</SelectItem>
                  <SelectItem value="-date_posted">Newest Posted</SelectItem>
                  <SelectItem value="title">Job Title (A-Z)</SelectItem>
                  <SelectItem value="company_name">Company (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-slate-500 hover:text-slate-900"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recruiter Matching Jobs Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Matched Candidate Opportunities ({totalCount})
            </CardTitle>
            <CardDescription className="text-xs">
              Filtered specifically for your active candidate portfolio.
            </CardDescription>
          </div>
          <div className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Opportunity</th>
                  <th className="py-2.5 px-3">Candidate Match / Status</th>
                  <th className="py-2.5 px-3">Visa Intelligence</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Salary</th>
                  <th className="py-2.5 px-3">Portal</th>
                  <th className="py-2.5 px-3">Scraped Date</th>
                  <th className="py-2.5 px-3">Posted Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading candidate matched opportunities...
                    </td>
                  </tr>
                ) : !hasCandidates ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <Users className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p className="font-semibold text-slate-700">No active candidates assigned to your account</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Once candidates with confirmed roles are assigned to you, relevant opportunities will appear here automatically.
                      </p>
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No opportunities match your assigned candidate roles under the current filters.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Title, Company & Restrictions */}
                      <td className="py-2.5 px-3 max-w-[260px]">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleOpenDetail(job.id)}
                            className="font-semibold text-slate-900 hover:text-primary hover:underline text-left block text-xs line-clamp-2 leading-tight"
                          >
                            {job.title}
                          </button>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-slate-600 font-medium text-[11px] truncate max-w-[140px]">
                              {job.company_name}
                            </span>
                            {job.detected_restrictions && job.detected_restrictions.length > 0 && (
                              <JobRestrictionBadges restrictions={job.detected_restrictions} compact />
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Candidate Match & Application Status */}
                      <td className="py-2.5 px-3 max-w-[220px]">
                        <div className="flex flex-col gap-1 items-start">
                          {job.matching_candidates && job.matching_candidates.length > 0 ? (
                            job.matching_candidates.map((mc: any) => (
                              mc.has_applied ? (
                                <Badge
                                  key={mc.id}
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold flex items-center gap-1 truncate max-w-[200px]"
                                >
                                  <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                  <span>Applied: {mc.name}</span>
                                </Badge>
                              ) : (
                                <Badge
                                  key={mc.id}
                                  variant="secondary"
                                  className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium truncate max-w-[200px]"
                                >
                                  Match: {mc.name}
                                </Badge>
                              )
                            ))
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              {job.target_role}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Visa Intelligence */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <VisaGradeBadge
                            grade={job.visa_grade}
                            score={job.visa_friendly_score}
                            visaMatched={job.visa_matched}
                            matchConfidence={job.company_match_confidence}
                            filingsCount={job.h1b_filings_recent}
                          />
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            {job.h1b_filings_recent > 0 && (
                              <span>{job.h1b_filings_recent.toLocaleString()} filings</span>
                            )}
                            {job.everify_enrolled && (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 py-0 px-1 text-[9px]">
                                E-Verify
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-2.5 px-3 text-slate-600 max-w-[130px] truncate">
                        {job.is_remote ? (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] py-0 px-1.5">
                            Remote
                          </Badge>
                        ) : (
                          <span>{job.city ? `${job.city}, ${job.state_code || job.state}` : (job.location_raw || "USA")}</span>
                        )}
                      </td>

                      {/* Salary */}
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {job.salary_raw || (job.salary_min ? `$${Number(job.salary_min).toLocaleString()}` : "Not Disclosed")}
                      </td>

                      {/* Portal */}
                      <td className="py-2.5 px-3">
                        <span className="capitalize font-medium text-slate-700">
                          {job.source_portal}
                        </span>
                      </td>

                      {/* Date Scraped */}
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                        <div className="flex items-center gap-1 text-slate-600 font-medium">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{formatDate(job.created_at)}</span>
                        </div>
                      </td>

                      {/* Date Posted */}
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {job.date_posted ? formatDate(job.date_posted) : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.job_url && (
                            <a
                              href={safeUrl(job.job_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                              title="Open original job listing"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(job.id)}
                            className="h-7 px-2 text-xs font-medium"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            View
                          </Button>
                          {job.all_applied ? (
                            <Badge variant="outline" className="h-7 px-2 text-[10px] bg-slate-50 text-slate-500 border-slate-200">
                              All Applied
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleOpenApplyModal(job)}
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Mark Applied
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div>
              Showing {jobs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="h-8 px-2.5"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    {selectedJob.source_portal}
                  </Badge>
                  {selectedJob.is_remote && (
                    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                      Remote
                    </Badge>
                  )}
                  {selectedJob.detected_restrictions && selectedJob.detected_restrictions.length > 0 && (
                    <JobRestrictionBadges restrictions={selectedJob.detected_restrictions} compact={false} />
                  )}
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {selectedJob.title}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-600 flex items-center gap-1.5 pt-0.5">
                  <Building className="h-3.5 w-3.5" />
                  {selectedJob.company_name}
                  <span className="mx-1">•</span>
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedJob.city ? `${selectedJob.city}, ${selectedJob.state_code || selectedJob.state}` : (selectedJob.location_raw || "USA")}
                  <span className="mx-1">•</span>
                  <Calendar className="h-3.5 w-3.5" />
                  Scraped: {formatDate(selectedJob.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Matched Candidate Context Banner */}
                {selectedJob.matching_candidates && selectedJob.matching_candidates.length > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                    <div>
                      <span className="font-semibold text-emerald-900 text-xs block">
                        Matching Your Assigned Candidates:
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedJob.matching_candidates.map((c: any) => (
                          <span
                            key={c.id}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              c.has_applied
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-white text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {c.has_applied ? "✓ Applied: " : ""}{c.name} ({c.email})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* External Application Link Bar */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-0.5 w-full sm:w-auto">
                    <span className="font-semibold text-slate-800 text-xs block">Job Application URL:</span>
                    <span className="text-slate-500 text-[11px] block truncate max-w-sm">
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
                        {copiedUrl ? <Check className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
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
                <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-slate-900 text-xs">Employer Visa Sponsorship</span>
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
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">H1B Total Filings</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {(selectedJob.h1b_filings_recent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Approvals / Denials</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {(selectedJob.h1b_approvals || 0).toLocaleString()} / {(selectedJob.h1b_denials || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Avg H1B Salary</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {selectedJob.h1b_avg_salary ? `$${selectedJob.h1b_avg_salary.toLocaleString()}` : "N/A"}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">PERM Green Card</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {selectedJob.green_card_sponsor ? "Yes (Sponsor)" : `${selectedJob.perm_filings || 0} filings`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 block mb-1">
                    Job Description:
                  </Label>
                  <div className="p-3 bg-white border border-slate-200 rounded-md max-h-56 overflow-y-auto whitespace-pre-wrap text-slate-700 text-xs leading-relaxed">
                    {selectedJob.job_description || "No full description text was captured for this listing."}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between border-t pt-3">
                <Button
                  size="sm"
                  onClick={() => handleOpenApplyModal(selectedJob)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Mark as Applied for Candidate
                </Button>
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

      {/* Mark as Applied Modal */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              Mark Job as Applied
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Track this opportunity for an assigned candidate in Hyrind.
            </DialogDescription>
          </DialogHeader>

          {targetJobForApply && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-900">{targetJobForApply.title}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {targetJobForApply.company_name} • {targetJobForApply.location_raw || targetJobForApply.city || "USA"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Select Assigned Candidate *</Label>
                <Select
                  value={selectedCandidateForApply}
                  onValueChange={setSelectedCandidateForApply}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Choose candidate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(targetJobForApply.matching_candidates && targetJobForApply.matching_candidates.length > 0
                      ? targetJobForApply.matching_candidates
                      : filterOptions.candidates
                    ).map((cand: any) => (
                      <SelectItem key={cand.id} value={cand.id} className="text-xs">
                        {cand.name} {cand.has_applied ? "(Already Applied)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Application Notes (Optional)</Label>
                <Input
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  placeholder="e.g., Applied via LinkedIn / customized resume submitted"
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApplyModalOpen(false)}
              disabled={submittingApply}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmMarkApplied}
              disabled={submittingApply || !selectedCandidateForApply}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {submittingApply ? "Saving Application..." : "Confirm Applied"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterJobDiscoveryPage;

