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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Search, Filter, ExternalLink, RefreshCw, CheckCircle2,
  XCircle, AlertCircle, Briefcase, Building, MapPin, DollarSign,
  Calendar, Eye, ThumbsUp, ThumbsDown, Copy, Layers, ChevronLeft,
  ChevronRight, ArrowUpDown, UserCheck, ShieldCheck
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
    by_role: [],
    by_source: [],
  });

  // Filter options
  const [filterOptions, setFilterOptions] = useState<{
    roles: string[];
    sources: string[];
    locations: string[];
    statuses: { value: string; label: string }[];
  }>({
    roles: [],
    sources: [],
    locations: [],
    statuses: [],
  });

  // Active Query filters
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
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
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Requirement D Promotion Modal
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
      setFilterOptions(res.data);
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
      if (selectedSource !== "all") params.source = selectedSource;
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
  }, [currentPage, pageSize, sortOrder, search, selectedRole, selectedSource, selectedStatus, isRemote, toast]);

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
    try {
      const res = await jobDiscoveryApi.jobDetail(jobId);
      setSelectedJob(res.data);
      setReviewNotes(res.data.review_notes || "");
    } catch (err: any) {
      toast({ title: "Failed to load job details", variant: "destructive" });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Submit review action
  const handleReviewAction = async (newStatus: string) => {
    if (!selectedJob) return;
    setSubmittingReview(true);
    try {
      await jobDiscoveryApi.reviewJob(selectedJob.id, {
        review_status: newStatus,
        review_notes: reviewNotes,
      });

      toast({
        title: `Job marked as ${newStatus.replace('_', ' ')}`,
        variant: newStatus === "APPROVED" ? "default" : "secondary",
      });

      setSelectedJob((prev: any) => ({
        ...prev,
        review_status: newStatus,
        review_notes: reviewNotes,
      }));

      fetchJobs();
      fetchStats();
    } catch (err: any) {
      toast({
        title: "Review update failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Open Promotion modal (Requirement D)
  const handleOpenPromote = async () => {
    try {
      const res = await candidatesApi.list();
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setCandidatesList(list);
      setShowPromoteModal(true);
    } catch (err) {
      console.warn("Failed to load candidates for promotion:", err);
      setShowPromoteModal(true);
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
        title: "Promoted to Job Management",
        description: "Job successfully approved and linked to management records.",
      });

      setShowPromoteModal(false);
      setSelectedJob((prev: any) => ({ ...prev, review_status: "APPROVED" }));
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

  const handleResetFilters = () => {
    setSearch("");
    setSelectedRole("all");
    setSelectedSource("all");
    setSelectedStatus("all");
    setIsRemote("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            Job Discovery Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Review, evaluate, and approve opportunities collected by the scraping engine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchStats(); fetchJobs(); }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3 bg-white shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Scraped</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.total_scraped || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Today</span>
          <p className="text-xl font-bold text-blue-600 mt-0.5">{stats.scraped_today || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs">
          <span className="text-xs text-slate-500 font-medium">This Week</span>
          <p className="text-xl font-bold text-indigo-600 mt-0.5">{stats.scraped_this_week || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs">
          <span className="text-xs text-amber-700 font-medium">Pending Review</span>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{stats.pending_review || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs">
          <span className="text-xs text-green-700 font-medium">Approved</span>
          <p className="text-xl font-bold text-green-600 mt-0.5">{stats.approved || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs">
          <span className="text-xs text-red-700 font-medium">Rejected</span>
          <p className="text-xl font-bold text-red-600 mt-0.5">{stats.rejected || 0}</p>
        </Card>
        <Card className="p-3 bg-white shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Duplicates</span>
          <p className="text-xl font-bold text-slate-600 mt-0.5">{stats.duplicates_detected || 0}</p>
        </Card>
      </div>

      {/* Search and Filters Toolbar */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Keyword Search */}
            <div className="lg:col-span-2">
              <Label className="text-xs text-slate-500 block mb-1">Search Keywords</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by job title, company name, or description..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 text-sm"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <Label className="text-xs text-slate-500 block mb-1">Target Role</Label>
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

            {/* Portal Source Filter */}
            <div>
              <Label className="text-xs text-slate-500 block mb-1">Source Portal</Label>
              <Select value={selectedSource} onValueChange={(val) => { setSelectedSource(val); setCurrentPage(1); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {filterOptions.sources.map((s, i) => (
                    <SelectItem key={i} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Status Quick Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
              {[
                { value: "all", label: "All" },
                { value: "PENDING_REVIEW", label: "Pending Review" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
                { value: "ALREADY_EXISTS", label: "Duplicates" },
              ].map((st) => (
                <Button
                  key={st.value}
                  variant={selectedStatus === st.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedStatus(st.value); setCurrentPage(1); }}
                  className="h-7 text-xs rounded-full px-3"
                >
                  {st.label}
                </Button>
              ))}
            </div>

            {/* Remote & Sorting & Clear */}
            <div className="flex items-center gap-2">
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_at">Newest Scraped</SelectItem>
                  <SelectItem value="created_at">Oldest Scraped</SelectItem>
                  <SelectItem value="-date_posted">Newest Posted</SelectItem>
                  <SelectItem value="title">Job Title (A-Z)</SelectItem>
                  <SelectItem value="company_name">Company (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-8 text-xs text-slate-500">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table Card */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              Discovered Opportunities ({totalCount})
            </CardTitle>
            <CardDescription>
              Showing {jobs.length} of {totalCount} listings matching your current filters.
            </CardDescription>
          </div>
          <div className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Job Title & Company</th>
                  <th className="py-2.5 px-3 font-semibold">Target Role</th>
                  <th className="py-2.5 px-3 font-semibold">Location</th>
                  <th className="py-2.5 px-3 font-semibold">Salary</th>
                  <th className="py-2.5 px-3 font-semibold">Portal</th>
                  <th className="py-2.5 px-3 font-semibold">Posted</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading opportunities from database...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No discovered jobs found matching your filters.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => {
                    const statusCfg = REVIEW_STATUS_CONFIG[job.review_status] || REVIEW_STATUS_CONFIG.PENDING_REVIEW;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Title & Company */}
                        <td className="py-2.5 px-3 max-w-[240px]">
                          <button
                            onClick={() => handleOpenDetail(job.id)}
                            className="font-semibold text-slate-900 hover:text-primary hover:underline text-left block truncate"
                          >
                            {job.title}
                          </button>
                          <span className="text-slate-500 text-[11px] block truncate">
                            {job.company_name}
                          </span>
                        </td>

                        {/* Target Role */}
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 font-normal">
                            {job.target_role}
                          </Badge>
                        </td>

                        {/* Location */}
                        <td className="py-2.5 px-3 text-slate-600 max-w-[140px] truncate">
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

                        {/* Portal Source */}
                        <td className="py-2.5 px-3">
                          <span className="capitalize font-medium text-slate-700">
                            {job.source_portal}
                          </span>
                        </td>

                        {/* Date Posted */}
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {job.date_posted ? formatDate(job.date_posted) : "Recent"}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Badge variant="outline" className={statusCfg.color}>
                            {statusCfg.label}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
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
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetail(job.id)}
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Review
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

          {/* Pagination Controls */}
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

      {/* Job Detail & Review Modal */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedJob && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                      {selectedJob.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-slate-600 mt-1">
                      {selectedJob.company_name} • {selectedJob.target_role}
                    </DialogDescription>
                  </div>
                  <Badge variant="outline" className={REVIEW_STATUS_CONFIG[selectedJob.review_status]?.color}>
                    {REVIEW_STATUS_CONFIG[selectedJob.review_status]?.label}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {selectedJob.is_remote ? "Remote" : (selectedJob.location_raw || "USA")}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                  {selectedJob.salary_raw || (selectedJob.salary_min ? `$${Number(selectedJob.salary_min).toLocaleString()}` : "Not Disclosed")}
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  Portal: <strong className="capitalize">{selectedJob.source_portal}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Scraped: {formatDate(selectedJob.created_at)}
                </span>
              </div>

              {/* Original Application Link Action */}
              {selectedJob.job_url && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-xs text-slate-700 font-medium">Original Posting URL:</span>
                  <a
                    href={safeUrl(selectedJob.job_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
                  >
                    Open Application in New Tab
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Duplicate Info (if duplicate) */}
              {selectedJob.is_duplicate && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <strong>Duplicate Listing Detected:</strong> Matches existing record (Content Hash: {selectedJob.content_hash?.slice(0, 12)}).
                </div>
              )}

              {/* Full Description */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-1">Complete Job Description</Label>
                <div className="max-h-60 overflow-y-auto p-3.5 rounded-md border border-slate-200 bg-white text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
                  {selectedJob.job_description || "No full job description available for this listing."}
                </div>
              </div>

              {/* Review Section */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <Label className="text-xs font-semibold text-slate-700 block">Recruiter Review & Decision</Label>
                <Textarea
                  placeholder="Optional review notes (e.g., matches John Doe's profile)..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="text-xs h-20"
                />

                {selectedJob.reviewed_by_email && (
                  <p className="text-[11px] text-slate-400">
                    Last reviewed by {selectedJob.reviewed_by_email} on {formatDateTime(selectedJob.reviewed_at)}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleReviewAction("APPROVED")}
                      disabled={submittingReview}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReviewAction("REJECTED")}
                      disabled={submittingReview}
                      className="text-red-700 border-red-200 hover:bg-red-50 text-xs gap-1"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleReviewAction("ALREADY_EXISTS")}
                      disabled={submittingReview}
                      className="text-xs text-slate-600"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Mark Duplicate
                    </Button>
                  </div>

                  {/* Future Integration Bridge Action */}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleOpenPromote}
                    className="text-xs gap-1 text-primary border-primary/20 bg-primary/10 hover:bg-primary/20"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Promote to Job Management...
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Requirement D: Promote to Job Management Modal */}
      <Dialog open={showPromoteModal} onOpenChange={setShowPromoteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Promote Opportunity to Job Management</DialogTitle>
            <DialogDescription>
              Optionally link this discovered vacancy into your active recruiter workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div>
              <Label className="block mb-1 font-semibold text-slate-700">Assign to Candidate (Optional):</Label>
              <Select value={promoteCandidateId} onValueChange={setPromoteCandidateId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select candidate to add application link..." />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="none">None (Do not link candidate)</SelectItem>
                  {candidatesList.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.user?.profile?.full_name || c.user?.email || c.id.slice(0, 8)} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="create_opening"
                checked={promoteCreateOpening}
                onChange={(e) => setPromoteCreateOpening(e.target.checked)}
                className="rounded text-primary"
              />
              <Label htmlFor="create_opening" className="cursor-pointer font-medium text-slate-700">
                Also add to internal Job Openings board
              </Label>
            </div>

            <div>
              <Label className="block mb-1 font-semibold text-slate-700">Internal Audit Note:</Label>
              <Textarea
                placeholder="Reason or candidate fit notes..."
                value={promoteNotes}
                onChange={(e) => setPromoteNotes(e.target.value)}
                className="text-xs h-16"
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
              className="gap-1.5"
            >
              {submittingPromotion ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJobDiscoveryPage;

