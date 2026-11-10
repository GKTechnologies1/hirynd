import React, { useState, useEffect, useCallback } from "react";
import { jobDiscoveryApi, candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/utils";
import { VisaGradeBadge } from "@/components/visa/VisaGradeBadge";
import { JobRestrictionBadges } from "@/components/job/JobRestrictionBadges";
import {
  Search, Filter, ExternalLink, RefreshCw, CheckCircle2,
  XCircle, AlertCircle, Briefcase, Building, MapPin, DollarSign,
  Calendar, Eye, Copy, ChevronLeft, ChevronRight, Award,
  ShieldCheck, FileText, Check, Sparkles
} from "lucide-react";

const REVIEW_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING_REVIEW: { label: "Pending Review", color: "bg-amber-100 text-amber-800 border-amber-200", icon: AlertCircle },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  ALREADY_EXISTS: { label: "Duplicate", color: "bg-slate-100 text-slate-700 border-slate-300", icon: Copy },
};

const safeUrl = (url?: string): string => {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return "#";
};

export const AdminJobDiscoveryPage = () => {
  const { toast } = useToast();

  // Statistics
  const [stats, setStats] = useState<any>({
    total_scraped: 0,
    scraped_today: 0,
    scraped_this_week: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    duplicates_detected: 0,
    visa_sponsored_count: 0,
    by_role: [],
    by_source: [],
    by_grade: [],
  });

  // Filter dropdown options from DB
  const [filterOptions, setFilterOptions] = useState<{
    roles: string[];
    sources: string[];
    locations: string[];
    companies: string[];
    visa_grades: string[];
    statuses: { value: string; label: string }[];
  }>({
    roles: [],
    sources: [],
    locations: [],
    companies: [],
    visa_grades: ["A", "B", "C", "D", "E", "F"],
    statuses: [],
  });

  // Active Query filters
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedVisaGrade, setSelectedVisaGrade] = useState("all");
  const [minScore, setMinScore] = useState<string>("all");
  const [h1bOnly, setH1bOnly] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isRemote, setIsRemote] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState("-created_at");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data states
  const [jobs, setJobs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Selected job for detail modal
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Promotion to candidate application modal
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [candidatesList, setCandidatesList] = useState<any[]>([]);
  const [promoteCandidateId, setPromoteCandidateId] = useState<string>("");
  const [promoteCreateOpening, setPromoteCreateOpening] = useState(true);
  const [promoteNotes, setPromoteNotes] = useState("");
  const [submittingPromotion, setSubmittingPromotion] = useState(false);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const res = await jobDiscoveryApi.statistics();
      setStats(res.data);
    } catch (err) {
      console.warn("Failed to load statistics:", err);
    }
  }, []);

  // Fetch filter dropdown options
  const fetchFilters = useCallback(async () => {
    try {
      const res = await jobDiscoveryApi.filters();
      setFilterOptions({
        roles: res.data?.roles || [],
        sources: res.data?.sources || [],
        locations: res.data?.locations || [],
        companies: res.data?.companies || [],
        visa_grades: res.data?.visa_grades || ["A", "B", "C", "D", "E", "F"],
        statuses: res.data?.statuses || [],
      });
    } catch (err) {
      console.warn("Failed to load filter options:", err);
    }
  }, []);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: pageSize,
        ordering: sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedRole !== "all") params.role = selectedRole;
      if (selectedCompany !== "all") params.company = selectedCompany;
      if (selectedSource !== "all") params.source = selectedSource;
      if (selectedVisaGrade !== "all") params.visa_grade = selectedVisaGrade;
      if (minScore !== "all") params.min_score = Number(minScore);
      if (h1bOnly) params.h1b_only = true;
      if (selectedStatus !== "all") params.review_status = selectedStatus;
      if (isRemote !== "all") params.is_remote = isRemote === "true";

      const res = await jobDiscoveryApi.jobs(params);
      setJobs(res.data?.results || []);
      setTotalCount(res.data?.count || 0);
      setTotalPages(res.data?.num_pages || 1);
    } catch (err: any) {
      toast({
        title: "Error fetching jobs",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    currentPage, pageSize, sortOrder, search, selectedRole, selectedCompany,
    selectedSource, selectedVisaGrade, minScore, h1bOnly, selectedStatus, isRemote, toast
  ]);

  useEffect(() => {
    fetchStats();
    fetchFilters();
  }, [fetchStats, fetchFilters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Open detail view
  const handleOpenDetail = async (jobId: string) => {
    setLoadingDetail(true);
    setCopiedUrl(false);
    try {
      const res = await jobDiscoveryApi.jobDetail(jobId);
      setSelectedJob(res.data);
    } catch (err: any) {
      toast({ title: "Failed to load job details", variant: "destructive" });
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
    setSelectedRole("all");
    setSelectedCompany("all");
    setSelectedSource("all");
    setSelectedVisaGrade("all");
    setMinScore("all");
    setH1bOnly(false);
    setSelectedStatus("all");
    setIsRemote("all");
    setSortOrder("-created_at");
    setCurrentPage(1);
  };

  // Open promotion dialog
  const handleOpenPromote = async (job: any) => {
    setSelectedJob(job);
    setShowPromoteModal(true);
    try {
      const res = await candidatesApi.list({ limit: 100 });
      setCandidatesList(res.data?.results || res.data || []);
    } catch (e) {
      console.warn("Failed to load candidates for promotion:", e);
    }
  };

  // Submit promotion
  const handlePromoteSubmit = async () => {
    if (!selectedJob) return;
    setSubmittingPromotion(true);
    try {
      await jobDiscoveryApi.approveForJobManagement(selectedJob.id, {
        candidate_id: promoteCandidateId || undefined,
        create_job_opening: promoteCreateOpening,
        notes: promoteNotes,
      });

      toast({
        title: "Job Promoted Successfully",
        description: "Opportunity has been bridged into job management.",
      });

      setShowPromoteModal(false);
      setPromoteNotes("");
      fetchJobs();
      fetchStats();
    } catch (err: any) {
      toast({
        title: "Promotion failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingPromotion(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Global Job Discovery
          </h1>
          <p className="text-sm text-slate-500">
            Central repository of all scraped opportunities enriched with Visa Intelligence.
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Total Scraped</span>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_scraped || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-blue-600 font-medium">Scraped Today</span>
          <p className="text-2xl font-bold text-blue-700 mt-0.5">{stats.scraped_today || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-emerald-600 font-medium">Visa Sponsoring</span>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.visa_sponsored_count || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-purple-600 font-medium">Top Grade (A/B)</span>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">
            {(stats.by_grade || [])
              .filter((g: any) => g.visa_grade === "A" || g.visa_grade === "B")
              .reduce((acc: number, curr: any) => acc + curr.count, 0)}
          </p>
        </Card>
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-amber-600 font-medium">This Week</span>
          <p className="text-2xl font-bold text-amber-700 mt-0.5">{stats.scraped_this_week || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs border-slate-200">
          <span className="text-xs text-slate-500 font-medium">Duplicates Filtered</span>
          <p className="text-2xl font-bold text-slate-600 mt-0.5">{stats.duplicates_detected || 0}</p>
        </Card>
      </div>

      {/* Filter and Search Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label className="text-xs font-semibold text-slate-600 block mb-1">Search Keywords</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Job title, company name, skill keywords..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 text-sm"
                />
              </div>
            </div>

            {/* Target Role */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 block mb-1">Target Role</Label>
              <Select value={selectedRole} onValueChange={(val) => { setSelectedRole(val); setCurrentPage(1); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
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
                  <SelectItem value="E,F">Grade E/F (Score &lt; 30)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Portal Source Filter */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 block mb-1">Source Portal</Label>
              <Select value={selectedSource} onValueChange={(val) => { setSelectedSource(val); setCurrentPage(1); }}>
                <SelectTrigger className="text-sm">
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
          </div>

          {/* Sub Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Visa Score Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Min Visa Score:</span>
                <Select value={minScore} onValueChange={(v) => { setMinScore(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-28 h-7 text-xs">
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

      {/* Main Jobs Table */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Discovered Opportunities ({totalCount})
            </CardTitle>
            <CardDescription className="text-xs">
              Showing {jobs.length} of {totalCount} total opportunities.
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
                  <th className="py-2.5 px-3">Job Title & Company</th>
                  <th className="py-2.5 px-3">Role</th>
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
                      Loading discovered opportunities...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No opportunities match your current filter parameters.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Title, Company & Restrictions */}
                      <td className="py-2.5 px-3 max-w-[280px]">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleOpenDetail(job.id)}
                            className="font-semibold text-slate-900 hover:text-primary hover:underline text-left block text-xs line-clamp-2 leading-tight"
                          >
                            {job.title}
                          </button>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-slate-600 font-medium text-[11px] truncate max-w-[150px]">
                              {job.company_name}
                            </span>
                            {job.detected_restrictions && job.detected_restrictions.length > 0 && (
                              <JobRestrictionBadges restrictions={job.detected_restrictions} compact />
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Target Role */}
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 font-normal text-[11px]">
                          {job.target_role}
                        </Badge>
                      </td>

                      {/* Visa Intelligence Column */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <VisaGradeBadge
                            grade={job.visa_grade}
                            score={job.visa_friendly_score}
                            visaMatched={job.visa_matched}
                            matchConfidence={job.company_match_confidence}
                            filingsCount={job.h1b_filings_recent}
                          />
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            {job.h1b_filings_recent > 0 ? (
                              <span>{job.h1b_filings_recent.toLocaleString()} filings</span>
                            ) : null}
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
                            className="h-7 px-2.5 text-xs font-medium"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" />
                            View
                          </Button>
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

      {/* Opportunity Detail Modal */}
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
                {/* External Application Link Bar */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-0.5 w-full sm:w-auto">
                    <span className="font-semibold text-slate-800 text-xs block">Official Job Application Link:</span>
                    <span className="text-slate-500 text-[11px] block truncate max-w-sm">
                      {selectedJob.job_url || "Direct portal link"}
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

                {/* Visa Intelligence Deep Dive Card */}
                <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-slate-900 text-xs">Visa Intelligence Breakdown</span>
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

                  {/* Factor Explanation */}
                  {selectedJob.score_factors && (
                    <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                      <span className="font-medium text-slate-700 block">Score Computation Factors:</span>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          Volume Points: <strong>+{selectedJob.score_factors.filing_volume_points || 0}</strong>
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          Approval Rate: <strong>+{selectedJob.score_factors.approval_rate_points || 0}</strong>
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          Recency: <strong>+{selectedJob.score_factors.recency_points || 0}</strong>
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          PERM: <strong>+{selectedJob.score_factors.perm_points || 0}</strong>
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          E-Verify: <strong>+{selectedJob.score_factors.everify_points || 0}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Job Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Target Role</span>
                    <span className="font-semibold text-slate-800">{selectedJob.target_role}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Employment Type</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {selectedJob.employment_type || "Full-time"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Compensation</span>
                    <span className="font-semibold text-slate-800">
                      {selectedJob.salary_raw || "Not Disclosed"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Date Posted</span>
                    <span className="font-semibold text-slate-800">
                      {selectedJob.date_posted ? formatDate(selectedJob.date_posted) : "Recent"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Date Scraped</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(selectedJob.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Source Portal</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {selectedJob.source_portal}
                    </span>
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

              <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPromote(selectedJob)}
                  className="h-8 text-xs font-medium"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Assign / Bridge to Candidate
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

      {/* Promotion Bridge Modal */}
      <Dialog open={showPromoteModal} onOpenChange={setShowPromoteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Bridge Opportunity to Candidate Application
            </DialogTitle>
            <DialogDescription className="text-xs">
              Convert this discovered opportunity into a candidate JobLinkEntry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-600 block mb-1">
                Select Candidate
              </Label>
              <Select value={promoteCandidateId} onValueChange={setPromoteCandidateId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Choose Candidate..." />
                </SelectTrigger>
                <SelectContent>
                  {candidatesList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name || c.email} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 block mb-1">
                Internal Notes
              </Label>
              <Textarea
                placeholder="Optional recruiter notes..."
                value={promoteNotes}
                onChange={(e) => setPromoteNotes(e.target.value)}
                className="text-xs h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPromoteModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePromoteSubmit}
              disabled={submittingPromotion}
            >
              {submittingPromotion ? "Bridging..." : "Confirm Bridge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJobDiscoveryPage;
