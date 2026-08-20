import { useState, useEffect, useMemo } from "react";
import { recruitersApi } from "@/services/api";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, FileText, Briefcase, KeyRound, DollarSign, ClipboardList, UserPlus, ExternalLink, MessageSquare, Globe, ChevronDown, X, Search, Plus, Trash2, Loader2, Save, Sparkles, Pencil, Ban, XCircle, MoreHorizontal } from "lucide-react";
import DocumentPreview from "@/components/dashboard/DocumentPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/DatePicker";

const formatSalaryDisplay = (rawSalary: any): string => {
  if (!rawSalary) return "Not Disclosed";
  const s = String(rawSalary).trim();
  if (!s || s === "-" || s.toLowerCase() === "not disclosed" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return "Not Disclosed";
  }
  const cleaned = s.replace(/^\$+/, '').trim();
  if (!cleaned) return "Not Disclosed";
  if (/^[€£₹]/.test(cleaned)) {
    return cleaned;
  }
  return `$${cleaned}`;
};

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
  if (!description) return <span className="text-muted-foreground">—</span>;

  const isLengthy = description.length > 100;
  if (!isLengthy) {
    return <span className="text-xs whitespace-pre-wrap">{description}</span>;
  }

  const preview = description.slice(0, 100) + "...";
  return (
    <div className="text-xs">
      <span>{preview}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReadMore(job || { company_name: company, role_title: role, job_description: description });
        }}
        className="text-primary hover:underline font-semibold ml-1 cursor-pointer"
      >
        Read More
      </button>
    </div>
  );
};


const navItems = [
  { label: "Overview", path: "/candidate-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <Briefcase className="h-4 w-4" /> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Applications", path: "/candidate-dashboard/applications", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Refer a Friend", path: "/candidate-dashboard/referrals", icon: <UserPlus className="h-4 w-4" /> },
];

const JOB_STATUSES = ["Applied", "Screening", "Screening Scheduled", "Interview", "Interview Scheduled", "Offer", "Rejected", "No Response"];

const CANDIDATE_STATUSES = [
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "screening_scheduled", label: "Screening Scheduled" },
  { value: "interview", label: "Interview" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "no_response", label: "No Response" },
];

interface CandidateApplicationsPageProps {
  candidate: any;
}

const CandidateApplicationsPage = ({ candidate }: CandidateApplicationsPageProps) => {
  const { user } = useAuth();
  const isStaff = user?.role === 'recruiter' || user?.role === 'admin' || user?.role === 'team_lead' || user?.role === 'team_manager';
  const { toast } = useToast();
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingJob, setUpdatingJob] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState<Record<string, string>>({});
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
  } | null>(null);

  // Form state for staff submit job application
  const [jobLinks, setJobLinks] = useState<Array<{
    company_name: string;
    role_title: string;
    job_url: string;
    job_description: string;
    resume_used: string;
    status: string;
    employment_type?: string;
    experience_required?: string;
    work_mode?: string;
    city?: string;
    state?: string;
    country?: string;
    salary?: string;
    visa_eligibility?: string;
  }>>([]);
  const [jobLinkErrors, setJobLinkErrors] = useState<Record<number, Record<string, string>>>({});
  const [savingLog, setSavingLog] = useState(false);
  const [fetchingJob, setFetchingJob] = useState<Record<number, boolean>>({});

  const addJobLink = () => {
    setJobLinks([...jobLinks, {
      company_name: "",
      role_title: "",
      job_url: "",
      job_description: "",
      resume_used: "",
      status: "Applied",
      employment_type: "",
      experience_required: "",
      work_mode: "",
      city: "",
      state: "",
      country: "",
      salary: "",
      visa_eligibility: "",
    }]);
  };

  const updateJobLink = (idx: number, field: string, value: string) => {
    const updated = [...jobLinks];
    (updated[idx] as any)[field] = value;
    setJobLinks(updated);

    // Clear inline error on change
    if (jobLinkErrors[idx]?.[field]) {
      setJobLinkErrors(prev => {
        const copy = { ...prev };
        if (copy[idx]) {
          const fieldErrors = { ...copy[idx] };
          delete fieldErrors[field];
          if (Object.keys(fieldErrors).length === 0) {
            delete copy[idx];
          } else {
            copy[idx] = fieldErrors;
          }
        }
        return copy;
      });
    }
  };

  const removeJobLink = (idx: number) => {
    setJobLinks(jobLinks.filter((_, i) => i !== idx));
    setJobLinkErrors(prev => {
      const next: Record<number, Record<string, string>> = {};
      Object.keys(prev).forEach(k => {
        const i = parseInt(k, 10);
        if (i < idx) next[i] = prev[i];
        else if (i > idx) next[i - 1] = prev[i];
      });
      return next;
    });
  };

  const validateJobLinks = () => {
    const newErrors: Record<number, Record<string, string>> = {};
    let hasError = false;

    jobLinks.forEach((j, idx) => {
      const errs: Record<string, string> = {};
      if (!j.company_name?.trim()) {
        errs.company_name = "Company Name is required";
        hasError = true;
      }
      if (!j.role_title?.trim()) {
        errs.role_title = "Role Title is required";
        hasError = true;
      }
      if (!j.job_description?.trim()) {
        errs.job_description = "Job Description is required";
        hasError = true;
      }
      if (!j.job_url?.trim()) {
        errs.job_url = "Job Application Link is required";
        hasError = true;
      } else if (!/^(https?:\/\/|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i.test(j.job_url.trim())) {
        errs.job_url = "Valid URL is required";
        hasError = true;
      }
      if (!j.resume_used?.trim()) {
        errs.resume_used = "Resume link is required";
        hasError = true;
      }
      if (!j.employment_type?.trim()) {
        errs.employment_type = "Employment Type is required";
        hasError = true;
      }
      if (!j.experience_required?.trim()) {
        errs.experience_required = "Experience is required";
        hasError = true;
      }
      if (!j.work_mode?.trim()) {
        errs.work_mode = "Work Mode is required";
        hasError = true;
      }
      if (!j.city?.trim()) {
        errs.city = "City is required";
        hasError = true;
      }
      if (!j.state?.trim()) {
        errs.state = "State is required";
        hasError = true;
      }
      if (!j.country?.trim()) {
        errs.country = "Country is required";
        hasError = true;
      }
      if (!j.salary?.trim()) {
        errs.salary = "Salary is required (e.g. $100k or Not Disclosed)";
        hasError = true;
      }
      if (!j.visa_eligibility?.trim()) {
        errs.visa_eligibility = "Visa Eligibility is required";
        hasError = true;
      }

      if (Object.keys(errs).length > 0) {
        newErrors[idx] = errs;
      }
    });

    setJobLinkErrors(newErrors);
    return !hasError;
  };

  const handleFetchJobDetails = async (idx: number) => {
    const url = jobLinks[idx].job_url;
    if (!url || !url.startsWith("http")) {
      toast({ title: "Valid URL required", variant: "destructive" }); return;
    }
    setFetchingJob(prev => ({ ...prev, [idx]: true }));
    try {
      const { data } = await recruitersApi.fetchJobDetails(url);
      if (data.role_title || data.company_name || data.job_description) {
        const updated = [...jobLinks];
        if (data.role_title) updated[idx].role_title = data.role_title;
        if (data.company_name) updated[idx].company_name = data.company_name;
        if (data.job_description) updated[idx].job_description = data.job_description;
        setJobLinks(updated);
        toast({ title: "Job details fetched!" });
      } else {
        toast({ title: "Could not extract details", description: "Please enter manually." });
      }
    } catch {
      toast({ title: "Fetch failed" });
    }
    setFetchingJob(prev => ({ ...prev, [idx]: false }));
  };

  const handleSubmitJobApplication = async () => {
    if (!candidate?.id) {
      toast({ title: "Candidate ID missing", variant: "destructive" }); return;
    }
    if (jobLinks.length === 0) {
      toast({ title: "Add at least one job link", variant: "destructive" }); return;
    }

    if (!validateJobLinks()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields marked in red.",
        variant: "destructive",
      });
      return;
    }

    setSavingLog(true);
    try {
      await recruitersApi.submitJobApplications(candidate.id, {
        job_links: jobLinks.map(j => {
          let url = (j.job_url || "").trim();
          if (url && !/^https?:\/\//i.test(url)) {
            url = "https://" + url;
          }
          let resume = (j.resume_used || "").trim();
          if (resume && !/^https?:\/\//i.test(resume) && (resume.includes(".") || resume.includes("google.com"))) {
            resume = "https://" + resume;
          }
          const rawStatus = (j.status || "applied").toString().trim();
          const formattedStatus = rawStatus.toLowerCase().replace(/ /g, "_");

          return {
            company_name: (j.company_name || "").trim(),
            role_title: (j.role_title || "").trim(),
            job_url: url,
            job_description: (j.job_description || "").trim(),
            resume_used: resume,
            status: formattedStatus || "applied",
            employment_type: j.employment_type || undefined,
            experience_required: j.experience_required || undefined,
            work_mode: j.work_mode || undefined,
            city: j.city || undefined,
            state: j.state || undefined,
            country: j.country || undefined,
            salary: j.salary?.trim() ? j.salary.trim() : "Not Disclosed",
            visa_eligibility: j.visa_eligibility || undefined,
          };
        }),
      });
      toast({ title: "Job applications submitted" });
      setJobLinks([]);
      setJobLinkErrors({});
      const jobsRes = await recruitersApi.getJobApplications(candidate.id).catch(() => ({ data: [] }));
      const jobsData = Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data?.results || []);
      setJobPostings(jobsData);
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingLog(false);
  };

  const handleUpdateJobField = async (jobId: string, field: string, value: any) => {
    try {
      setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, [field]: value } : j));
      await recruitersApi.updateJobField(jobId, { [field]: value });
      toast({ title: "Job detail updated" });
    } catch (err: any) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  // Edit & Delete Application states
  const [editJobDialogOpen, setEditJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [savingEditJob, setSavingEditJob] = useState(false);
  const [deleteJobTarget, setDeleteJobTarget] = useState<any>(null);

  const [editJobForm, setEditJobForm] = useState({
    company_name: "",
    role_title: "",
    job_url: "",
    job_description: "",
    resume_used: "",
    employment_type: "",
    experience_required: "",
    work_mode: "",
    city: "",
    state: "",
    country: "",
    salary: "",
    visa_eligibility: "",
    status: "applied",
  });

  const handleOpenEditJob = (job: any) => {
    if (!isStaff) {
      toast({ title: "Permission Denied", description: "Only admin and staff can edit application details.", variant: "destructive" });
      return;
    }
    setEditingJob(job);
    setEditJobForm({
      company_name: job.company_name || "",
      role_title: job.role_title || job.title || "",
      job_url: job.job_url || job.job_link || "",
      job_description: job.job_description || "",
      resume_used: job.resume_used || "",
      employment_type: job.employment_type || "",
      experience_required: job.experience_required || "",
      work_mode: job.work_mode || "",
      city: job.city || "",
      state: job.state || "",
      country: job.country || "",
      salary: job.salary || "",
      visa_eligibility: job.visa_eligibility || "",
      status: (job.candidate_response_status || job.application_status || job.status || "applied").toLowerCase().replace(/ /g, "_"),
    });
    setEditJobDialogOpen(true);
  };

  const handleSaveEditJob = async () => {
    if (!isStaff) {
      toast({ title: "Permission Denied", description: "Only admin and staff can edit application details.", variant: "destructive" });
      return;
    }
    if (!editJobForm.role_title || !editJobForm.company_name) {
      toast({ title: "Role Title and Company Name are required", variant: "destructive" });
      return;
    }
    if (!editingJob?.id) return;
    const jobId = editingJob.id;
    const updatedPayload = {
      ...editJobForm,
      status: editJobForm.status,
      application_status: editJobForm.status,
      candidate_response_status: editJobForm.status,
    };

    setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, ...updatedPayload } : j));
    setEditJobDialogOpen(false);
    setSavingEditJob(true);

    try {
      await recruitersApi.updateJobField(jobId, updatedPayload);
      toast({ title: "Application updated successfully" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setSavingEditJob(false);
    }
  };

  const handleMarkExpired = async (job: any) => {
    if (!isStaff) {
      toast({ title: "Permission Denied", description: "Only admin and staff can mark applications as expired.", variant: "destructive" });
      return;
    }
    if (!job?.id) return;
    const jobId = job.id;
    setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, status: "expired", application_status: "expired", candidate_response_status: "expired" } : j));
    toast({
      title: "Application Marked Expired",
      description: `Marked "${job.role_title || job.title || "Job"}" as expired.`,
    });

    try {
      await recruitersApi.updateJobStatus(jobId, "expired");
    } catch (e: any) {
      toast({ title: "Expiration failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const handleRejectJob = async (job: any) => {
    if (!isStaff) {
      toast({ title: "Permission Denied", description: "Only admin and staff can reject applications.", variant: "destructive" });
      return;
    }
    if (!job?.id) return;
    const jobId = job.id;
    setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, status: "rejected", application_status: "rejected", candidate_response_status: "rejected" } : j));
    toast({
      title: "Application Rejected",
      description: `Marked "${job.role_title || job.title || "Job"}" as rejected.`,
    });

    try {
      await recruitersApi.updateJobStatus(jobId, "rejected");
    } catch (e: any) {
      toast({ title: "Rejection failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const handleConfirmDeleteJob = async () => {
    if (!isStaff) {
      toast({ title: "Permission Denied", description: "Only admin and staff can delete applications.", variant: "destructive" });
      return;
    }
    if (!deleteJobTarget?.id) return;
    const targetId = deleteJobTarget.id;
    const targetTitle = deleteJobTarget.role_title || deleteJobTarget.title || "Job";

    setJobPostings(prev => prev.filter(j => j.id !== targetId));
    setDeleteJobTarget(null);
    toast({ title: "Application Deleted", description: `Deleted "${targetTitle}".` });

    try {
      await recruitersApi.deleteJobAlert(targetId);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
  };

  const [searchRole, setSearchRole] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredJobPostings = useMemo(() => {
    return jobPostings.filter(j => {
      const matchRole = !searchRole || j.role_title?.toLowerCase().includes(searchRole.toLowerCase());
      const matchCompany = !searchCompany || j.company_name?.toLowerCase().includes(searchCompany.toLowerCase());

      let matchDate = true;
      const logDateStr = j.log_date || j.created_at;
      if (logDateStr) {
        // Construct date at local midnight to avoid timezone shift
        const cleanDate = logDateStr.split("T")[0];
        const [y, m, d] = cleanDate.split("-").map((s: string) => parseInt(s, 10));
        const itemDate = new Date(y, m - 1, d);
        itemDate.setHours(0, 0, 0, 0);

        if (fromDate) {
          const fParts = fromDate.split(/[-\/]/);
          if (fParts.length === 3) {
            const fd = new Date(parseInt(fParts[2], 10), parseInt(fParts[0], 10) - 1, parseInt(fParts[1], 10));
            fd.setHours(0, 0, 0, 0);
            if (itemDate < fd) matchDate = false;
          }
        }

        if (toDate) {
          const tParts = toDate.split(/[-\/]/);
          if (tParts.length === 3) {
            const td = new Date(parseInt(tParts[2], 10), parseInt(tParts[0], 10) - 1, parseInt(tParts[1], 10));
            td.setHours(23, 59, 59, 999);
            if (itemDate > td) matchDate = false;
          }
        }
      } else {
        if (fromDate || toDate) matchDate = false;
      }

      const currentStatus = j.candidate_response_status || j.status || j.application_status;
      const matchAction = actionFilter === "all" || currentStatus?.toLowerCase() === actionFilter.toLowerCase();

      return matchRole && matchCompany && matchDate && matchAction;
    });
  }, [jobPostings, searchRole, searchCompany, fromDate, toDate, actionFilter]);

  const handleOpenDescription = (jobOrCompany: any, role?: string, description?: string) => {
    if (typeof jobOrCompany === "string") {
      setActiveJobDesc({
        company: jobOrCompany,
        role: role || "",
        description: description || "",
        salary: "Not Disclosed",
      });
    } else {
      const j = jobOrCompany;
      const locationParts = [j.city, j.state, j.country].filter(Boolean).join(", ");
      setActiveJobDesc({
        company: j.company_name || "",
        role: j.role_title || "",
        description: j.job_description || "",
        employment_type: j.employment_type,
        experience_required: j.experience_required,
        work_mode: j.work_mode,
        location: locationParts || j.location,
        salary: formatSalaryDisplay(j.salary),
        visa_eligibility: j.visa_eligibility,
      });
    }
  };

  useEffect(() => {
    if (!candidate?.id) return;
    let isFirstLoad = true;
    const fetchData = async () => {
      if (isFirstLoad) setLoading(true);
      const backgroundConfig = !isFirstLoad ? { headers: { 'X-Background-Request': 'true' } } : undefined;
      try {
        const [logsRes, jobsRes] = await Promise.all([
          recruitersApi.getDailyLogs(candidate.id, backgroundConfig).catch(() => ({ data: [] })),
          recruitersApi.getJobApplications(candidate.id, backgroundConfig).catch(() => ({ data: [] })),
        ]);
        const logsData = Array.isArray(logsRes.data) ? logsRes.data : (logsRes.data?.results || []);
        setDailyLogs(logsData);

        // Merge daily-log job entries + recruiter-submitted job applications
        const logJobs = logsData.flatMap((l: any) =>
          (l.job_entries || []).map((j: any) => ({
            ...j,
            log_date: l.log_date || l.created_at
          }))
        );
        const rawJobs = Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data?.results || []);
        const recruiterJobs = rawJobs.map((j: any) => ({
          ...j,
          log_date: j.log_date || j.created_at,
        }));

        // De-duplicate by id (in case any overlap)
        const seen = new Set<string>();
        const merged: any[] = [];
        for (const j of [...recruiterJobs, ...logJobs]) {
          if (!seen.has(j.id)) {
            seen.add(j.id);
            merged.push(j);
          }
        }
        setJobPostings(merged);
      } catch (err: any) {
        console.error("Error fetching applications:", err);
        if (isFirstLoad) {
          toast({
            title: "Failed to load applications",
            description: "There was an error fetching your application history. Please try again later.",
            variant: "destructive"
          });
        }
        setDailyLogs([]);
        setJobPostings([]);
      } finally {
        if (isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };
    fetchData();

    // 45s background polling to significantly reduce server & DB load
    const interval = setInterval(fetchData, 45000);

    // Refresh immediately when candidate switches back to this tab
    const handleFocus = () => {
      fetchData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [candidate?.id, candidate?.updated_at]); // Depend on updated_at to refresh when parent refreshes

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    setUpdatingJob(jobId);
    try {
      await recruitersApi.updateJobStatus(jobId, newStatus);
      toast({ title: "Status updated" });
      setJobPostings(prev => prev.map(j => j.id === jobId ? { ...j, candidate_response_status: newStatus, application_status: newStatus } : j));
      setStatusNotes(prev => ({ ...prev, [jobId]: "" }));
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setUpdatingJob(null);
  };

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  // Robust count logic using date slicing and created_at fallback
  const todayCount = dailyLogs
    .filter(l => (l.log_date || l.created_at)?.split("T")[0] === today)
    .reduce((s, l) => s + (l.applications_count || 0), 0) +
    jobPostings.filter(j => (j.log_date || j.created_at)?.split("T")[0] === today).length;

  const weekCount = dailyLogs
    .filter(l => (l.log_date || l.created_at)?.split("T")[0] >= weekAgo)
    .reduce((s, l) => s + (l.applications_count || 0), 0) +
    jobPostings.filter(j => (j.log_date || j.created_at)?.split("T")[0] >= weekAgo).length;

  const monthCount = dailyLogs
    .filter(l => (l.log_date || l.created_at)?.split("T")[0] >= monthAgo)
    .reduce((s, l) => s + (l.applications_count || 0), 0) +
    jobPostings.filter(j => (j.log_date || j.created_at)?.split("T")[0] >= monthAgo).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {loading ? <div className="flex items-center justify-center p-12"><p className="text-muted-foreground animate-pulse">Loading applications...</p></div> : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Today", value: todayCount },
              { label: "This Week", value: weekCount },
              { label: "This Month", value: monthCount },
              { label: "Total Applications", value: jobPostings.length },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-card-foreground">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Submit Job Application (Staff / Admin View) */}
          {isStaff && (
            <Card className="border-none shadow-sm bg-card/60">
              <CardHeader><CardTitle className="text-base font-bold">Submit Job Application</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <h4 className="text-sm font-bold flex items-center gap-2">Jobs & URLs <span className="text-[11px] font-medium text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">{jobLinks.length}</span></h4>
                    <Button variant="ghost" size="sm" onClick={addJobLink} className="h-8 text-[11px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/5 rounded-lg border border-secondary/20">
                      <Plus className="mr-1 h-3 w-3" /> Add Job Application Link
                    </Button>
                  </div>

                  {jobLinks.length === 0 && (
                    <div className="p-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border/50 text-xs text-muted-foreground italic">
                      Add specific job links that were submitted for more granular tracking.
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2">
                    {jobLinks.map((job, idx) => (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={idx} className="rounded-2xl border border-border/50 p-4 bg-muted/5 space-y-3 relative group">
                        <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeJobLink(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <div className="grid gap-3 grid-cols-2">
                          <div className="space-y-1">
                            <Input
                              placeholder="Company Name *"
                              className={cn("h-9 text-xs bg-background/50", jobLinkErrors[idx]?.company_name && "border-destructive focus-visible:ring-destructive")}
                              value={job.company_name}
                              onChange={e => updateJobLink(idx, "company_name", e.target.value)}
                            />
                            {jobLinkErrors[idx]?.company_name && (
                              <p className="text-[10px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-top-1">
                                {jobLinkErrors[idx].company_name}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <Input
                              placeholder="Role Title *"
                              className={cn("h-9 text-xs bg-background/50", jobLinkErrors[idx]?.role_title && "border-destructive focus-visible:ring-destructive")}
                              value={job.role_title}
                              onChange={e => updateJobLink(idx, "role_title", e.target.value)}
                            />
                            {jobLinkErrors[idx]?.role_title && (
                              <p className="text-[10px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-top-1">
                                {jobLinkErrors[idx].role_title}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Textarea
                            placeholder="Job Description *"
                            className={cn("text-xs bg-background/50 min-h-[80px]", jobLinkErrors[idx]?.job_description && "border-destructive focus-visible:ring-destructive")}
                            value={job.job_description}
                            onChange={e => updateJobLink(idx, "job_description", e.target.value)}
                          />
                          {jobLinkErrors[idx]?.job_description && (
                            <p className="text-[10px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-top-1">
                              {jobLinkErrors[idx].job_description}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="relative">
                            <Input
                              placeholder="Job Application Link *"
                              className={cn("h-9 text-xs bg-background/50 pr-8", jobLinkErrors[idx]?.job_url && "border-destructive focus-visible:ring-destructive")}
                              value={job.job_url}
                              onChange={e => updateJobLink(idx, "job_url", e.target.value)}
                            />
                            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-secondary" onClick={() => handleFetchJobDetails(idx)} disabled={fetchingJob[idx]}>
                              {fetchingJob[idx] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                          {jobLinkErrors[idx]?.job_url && (
                            <p className="text-[10px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-top-1">
                              {jobLinkErrors[idx].job_url}
                            </p>
                          )}
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="space-y-1 flex-1">
                            <Input
                              placeholder="Add google drive link of resume *"
                              className={cn("h-9 text-[10px] font-bold bg-background/50", jobLinkErrors[idx]?.resume_used && "border-destructive focus-visible:ring-destructive")}
                              value={job.resume_used}
                              onChange={e => updateJobLink(idx, "resume_used", e.target.value)}
                            />
                            {jobLinkErrors[idx]?.resume_used && (
                              <p className="text-[10px] text-destructive font-medium ml-1 animate-in fade-in slide-in-from-top-1">
                                {jobLinkErrors[idx].resume_used}
                              </p>
                            )}
                          </div>
                          <Select value={job.status} onValueChange={v => updateJobLink(idx, "status", v)}>
                            <SelectTrigger className="w-36 h-9 text-[10px] font-bold bg-background/50"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {JOB_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Job Details (Mandatory) */}
                        <div className="pt-2 border-t border-border/30 space-y-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                            Job Details
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Select value={job.employment_type || ""} onValueChange={v => updateJobLink(idx, "employment_type", v)}>
                                <SelectTrigger className={cn("h-8 text-[10px] bg-background/50", jobLinkErrors[idx]?.employment_type && "border-destructive text-destructive")}>
                                  <SelectValue placeholder="Employment Type *" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Full-Time" className="text-xs">Full-Time</SelectItem>
                                  <SelectItem value="Contract" className="text-xs">Contract</SelectItem>
                                  <SelectItem value="Contract-to-Hire" className="text-xs">Contract-to-Hire</SelectItem>
                                  <SelectItem value="Internship" className="text-xs">Internship</SelectItem>
                                  <SelectItem value="W2" className="text-xs">W2</SelectItem>
                                  <SelectItem value="C2C" className="text-xs">C2C</SelectItem>
                                </SelectContent>
                              </Select>
                              {jobLinkErrors[idx]?.employment_type && (
                                <p className="text-[9px] text-destructive font-medium ml-1">{jobLinkErrors[idx].employment_type}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Select value={job.experience_required || ""} onValueChange={v => updateJobLink(idx, "experience_required", v)}>
                                <SelectTrigger className={cn("h-8 text-[10px] bg-background/50", jobLinkErrors[idx]?.experience_required && "border-destructive text-destructive")}>
                                  <SelectValue placeholder="Experience Required *" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0–2 Years" className="text-xs">0–2 Years</SelectItem>
                                  <SelectItem value="2–5 Years" className="text-xs">2–5 Years</SelectItem>
                                  <SelectItem value="5+ Years" className="text-xs">5+ Years</SelectItem>
                                  <SelectItem value="Senior Level" className="text-xs">Senior Level</SelectItem>
                                </SelectContent>
                              </Select>
                              {jobLinkErrors[idx]?.experience_required && (
                                <p className="text-[9px] text-destructive font-medium ml-1">{jobLinkErrors[idx].experience_required}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Select value={job.work_mode || ""} onValueChange={v => updateJobLink(idx, "work_mode", v)}>
                                <SelectTrigger className={cn("h-8 text-[10px] bg-background/50", jobLinkErrors[idx]?.work_mode && "border-destructive text-destructive")}>
                                  <SelectValue placeholder="Work Mode *" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Remote" className="text-xs">Remote</SelectItem>
                                  <SelectItem value="Hybrid" className="text-xs">Hybrid</SelectItem>
                                  <SelectItem value="Onsite" className="text-xs">Onsite</SelectItem>
                                </SelectContent>
                              </Select>
                              {jobLinkErrors[idx]?.work_mode && (
                                <p className="text-[9px] text-destructive font-medium ml-1">{jobLinkErrors[idx].work_mode}</p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Input
                                placeholder="City *"
                                className={cn("h-8 text-[10px] bg-background/50", jobLinkErrors[idx]?.city && "border-destructive focus-visible:ring-destructive")}
                                value={job.city || ""}
                                onChange={e => updateJobLink(idx, "city", e.target.value)}
                              />
                              {jobLinkErrors[idx]?.city && (
                                <p className="text-[9px] text-destructive font-medium ml-1">{jobLinkErrors[idx].city}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Input
                                placeholder="State *"
                                className={cn("h-8 text-[10px] bg-background/50", jobLinkErrors[idx]?.state && "border-destructive focus-visible:ring-destructive")}
                                value={job.state || ""}
                                onChange={e => updateJobLink(idx, "state", e.target.value)}
                              />
                              {jobLinkErrors[idx]?.state && (
                                <p className="text-[9px] text-destructive font-medium ml-1">{jobLinkErrors[idx].state}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Input
                                placeholder="Country *"
                                className={cn("h-8 text-[10px] bg-background/50", jobLinkErrors[idx]?.country && "border-destructive focus-visible:ring-destructive")}
                                value={job.country || ""}
                                onChange={e => updateJobLink(idx, "country", e.target.value)}
                              />
                              {jobLinkErrors[idx]?.country && (
                                <p className="text-[9px] text-destructive font-medium ml-1">{jobLinkErrors[idx].country}</p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Input
                                placeholder="Salary (e.g. $100k or Not Disclosed) *"
                                className={cn("h-8 text-[10px] bg-background/50", jobLinkErrors[idx]?.salary && "border-destructive focus-visible:ring-destructive")}
                                value={job.salary || ""}
                                onChange={e => updateJobLink(idx, "salary", e.target.value)}
                              />
                              {jobLinkErrors[idx]?.salary && (
                                <p className="text-[9px] text-destructive font-medium ml-1">{jobLinkErrors[idx].salary}</p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <Select value={job.visa_eligibility || ""} onValueChange={v => updateJobLink(idx, "visa_eligibility", v)}>
                                <SelectTrigger className={cn("h-8 text-[10px] bg-background/50", jobLinkErrors[idx]?.visa_eligibility && "border-destructive text-destructive")}>
                                  <SelectValue placeholder="Visa Eligibility *" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="OPT" className="text-xs">OPT</SelectItem>
                                  <SelectItem value="STEM OPT" className="text-xs">STEM OPT</SelectItem>
                                  <SelectItem value="H1B" className="text-xs">H1B</SelectItem>
                                  <SelectItem value="H1B Transfer" className="text-xs">H1B Transfer</SelectItem>
                                  <SelectItem value="USC" className="text-xs">USC</SelectItem>
                                  <SelectItem value="Green Card" className="text-xs">Green Card</SelectItem>
                                  <SelectItem value="All Work Authorization" className="text-xs">All Work Authorization</SelectItem>
                                </SelectContent>
                              </Select>
                              {jobLinkErrors[idx]?.visa_eligibility && (
                                <p className="text-[9px] text-destructive font-medium ml-1">{jobLinkErrors[idx].visa_eligibility}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {jobLinks.length > 3 && (
                          <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                            <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {jobLinks.length > 0 && (
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSubmitJobApplication} disabled={savingLog} className="h-10 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                        {savingLog ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Submit {jobLinks.length} Job Application{jobLinks.length > 1 ? 's' : ''}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Master Application Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-secondary" />
                All Submissions ({jobPostings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pt-4 pb-2">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 mb-4 items-end">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search by Role</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                      <Input
                        placeholder="e.g. Frontend"
                        value={searchRole}
                        onChange={(e) => setSearchRole(e.target.value)}
                        className="pl-8 pr-8 h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full"
                      />
                      {searchRole && (
                        <button
                          onClick={() => setSearchRole("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search by Company</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                      <Input
                        placeholder="e.g. Google"
                        value={searchCompany}
                        onChange={(e) => setSearchCompany(e.target.value)}
                        className="pl-8 pr-8 h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full"
                      />
                      {searchCompany && (
                        <button
                          onClick={() => setSearchCompany("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From Date</Label>
                    <DatePicker
                      value={fromDate}
                      onChange={setFromDate}
                      placeholder="MM-DD-YYYY"
                      formatStr="MM-dd-yyyy"
                      className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors font-semibold w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To Date</Label>
                    <DatePicker
                      value={toDate}
                      onChange={setToDate}
                      placeholder="MM-DD-YYYY"
                      formatStr="MM-dd-yyyy"
                      className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors font-semibold w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</Label>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="h-8 text-[11px] bg-muted/30 border-border/60 focus:bg-background transition-colors w-full">
                        <SelectValue placeholder="All Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Actions</SelectItem>
                        {CANDIDATE_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DataTable
                data={filteredJobPostings}
                isLoading={loading}
                emptyMessage="No applications submitted yet."
                columns={[
                  {
                    header: "ID",
                    sortable: true,
                    accessorKey: "id",
                    render: (j: any) => (
                      <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap">
                        {`HYRSUB${j.id.toString().slice(-6).toUpperCase()}`}
                      </span>
                    ),
                    className: "pl-6"
                  },
                  {
                    header: "Company Name",
                    accessorKey: "company_name",
                    sortable: true,
                    className: "font-medium text-sm"
                  },
                  {
                    header: "Role Title",
                    accessorKey: "role_title",
                    sortable: true,
                    className: "text-sm"
                  },
                  {
                    header: "Employment Type",
                    accessorKey: "employment_type",
                    sortable: true,
                    className: "px-2 py-3 whitespace-nowrap",
                    render: (j: any) => j.employment_type ? (
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200/60 font-semibold text-xs">
                        {j.employment_type}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>
                  },
                  {
                    header: "Experience Required",
                    accessorKey: "experience_required",
                    sortable: true,
                    className: "px-2 py-3 whitespace-nowrap",
                    render: (j: any) => j.experience_required ? (
                      <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-200/60 font-semibold text-xs">
                        {j.experience_required}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>
                  },
                  {
                    header: "Work Mode",
                    accessorKey: "work_mode",
                    sortable: true,
                    className: "px-2 py-3 whitespace-nowrap",
                    render: (j: any) => j.work_mode ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200/60 font-semibold text-xs">
                        {j.work_mode}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>
                  },
                  {
                    header: "City",
                    accessorKey: "city",
                    sortable: true,
                    className: "px-2 py-3 whitespace-nowrap text-xs font-medium text-foreground",
                    render: (j: any) => j.city || <span className="text-muted-foreground">—</span>
                  },
                  {
                    header: "State",
                    accessorKey: "state",
                    sortable: true,
                    className: "px-2 py-3 whitespace-nowrap text-xs font-medium text-foreground",
                    render: (j: any) => j.state || <span className="text-muted-foreground">—</span>
                  },
                  {
                    header: "Country",
                    accessorKey: "country",
                    sortable: true,
                    className: "px-2 py-3 whitespace-nowrap text-xs font-medium text-foreground",
                    render: (j: any) => j.country || <span className="text-muted-foreground">—</span>
                  },
                  {
                    header: "Salary",
                    accessorKey: "salary",
                    sortable: true,
                    className: "px-2 py-3 whitespace-nowrap text-xs font-bold text-foreground",
                    render: (j: any) => formatSalaryDisplay(j.salary)
                  },
                  {
                    header: "Visa Eligibility",
                    accessorKey: "visa_eligibility",
                    sortable: true,
                    className: "px-2 py-3 whitespace-nowrap",
                    render: (j: any) => j.visa_eligibility ? (
                      <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200/60 font-semibold text-xs">
                        {j.visa_eligibility}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>
                  },
                  {
                    header: "Job Description",
                    render: (j: any) => (
                      <JobDescriptionCell
                        company={j.company_name}
                        role={j.role_title}
                        description={j.job_description}
                        job={j}
                        onReadMore={handleOpenDescription}
                      />
                    )
                  },
                  {
                    header: "Job Link",
                    render: (j: any) => (
                      j.job_url ? (
                        <DocumentPreview
                          url={j.job_url}
                          label="View Job"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        />
                      ) : "—"
                    )
                  },
                  {
                    header: "Resume Link",
                    render: (j: any) => (
                      j.resume_used ? (
                        j.resume_used.startsWith('http') ? (
                          <DocumentPreview
                            url={j.resume_used}
                            label="View Resume"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          />
                        ) : (
                          <span className="text-xs font-mono opacity-80">{j.resume_used}</span>
                        )
                      ) : "—"
                    )
                  },
                  {
                    header: "Recruiter Status",
                    sortable: true,
                    accessorKey: "candidate_response_status",
                    render: (j: any) => <StatusBadge status={j.candidate_response_status || j.status || j.application_status} />
                  },
                  {
                    header: "Logged Date & Time",
                    sortable: true,
                    accessorKey: "created_at",
                    className: "px-6 py-4 text-right pr-6 whitespace-nowrap",
                    render: (j: any) => <span className="text-[11px] text-muted-foreground font-medium">{formatDateTime(j.created_at || j.log_date)}</span>
                  },
                  {
                    header: "Actions",
                    className: "pr-6 text-right whitespace-nowrap",
                    render: (j: any) => {
                      const status = (j.candidate_response_status || j.application_status || j.status || "").toLowerCase();
                      const isExpired = status === "expired";
                      const isRejected = status === "rejected";
                      return (
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={j.candidate_response_status || j.application_status || ""}
                            onValueChange={(val) => handleStatusUpdate(j.id, val)}
                            disabled={updatingJob === j.id}
                          >
                            <SelectTrigger className="w-28 h-7 text-[10px] font-bold border-none bg-muted-50">
                              <SelectValue placeholder="Update..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CANDIDATE_STATUSES.map(s => (
                                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {isStaff && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleOpenEditJob(j);
                                }}
                                className="h-7 px-2 text-[11px] font-semibold text-blue-700 border-blue-200 bg-blue-50/80 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                                title="Edit application details"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground border-border/60 bg-muted/20 hover:bg-muted/60 cursor-pointer"
                                    title="More actions"
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover rounded-xl shadow-lg border border-border p-1 min-w-[160px] z-50">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditJob(j);
                                    }}
                                    className="text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 rounded-lg cursor-pointer px-2.5 py-1.5 flex items-center gap-2"
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-blue-600" />
                                    Edit Details
                                  </DropdownMenuItem>

                                  {!isExpired && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkExpired(j);
                                      }}
                                      className="text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer px-2.5 py-1.5 flex items-center gap-2"
                                    >
                                      <Ban className="h-3.5 w-3.5 text-rose-600" />
                                      Mark Expired
                                    </DropdownMenuItem>
                                  )}

                                  {!isRejected && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRejectJob(j);
                                      }}
                                      className="text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer px-2.5 py-1.5 flex items-center gap-2"
                                    >
                                      <XCircle className="h-3.5 w-3.5 text-amber-600" />
                                      Reject Application
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteJobTarget(j);
                                    }}
                                    className="text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg cursor-pointer px-2.5 py-1.5 flex items-center gap-2"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                    Delete Application
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      );
                    }
                  }
                ]}
              />
              {filteredJobPostings.length > 5 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Summary grouping (Optional) */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold opacity-70">Daily Summary</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {dailyLogs.map((log: any) => (
                  <AccordionItem key={log.id} value={log.id}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-4 text-left">
                        <span className="text-sm font-bold">{formatDateTime(log.created_at || log.log_date)}</span>
                        <span className="text-xs text-muted-foreground">{log.applications_count} applications logged</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {log.notes && <p className="text-sm text-muted-foreground italic border-l-2 pl-3 border-secondary/30">{log.notes}</p>}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {dailyLogs.length > 5 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group mt-2">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                </div>
              )}
            </CardContent>
          </Card>


          {/* Drive folder link */}
          {candidate?.drive_folder_url && (
            <Card>
              <CardContent className="p-4">
                <DocumentPreview
                  url={candidate.drive_folder_url}
                  label="View Resume Folder"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
              {activeJobDesc?.description}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Job Details Modal */}
      <Dialog open={editJobDialogOpen} onOpenChange={setEditJobDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-background border border-border p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Pencil className="h-4 w-4 text-blue-600" />
              Edit Job Application Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Role Title *</Label>
                <Input
                  value={editJobForm.role_title}
                  onChange={(e) => setEditJobForm({ ...editJobForm, role_title: e.target.value })}
                  placeholder="e.g. Software Engineer"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Company Name *</Label>
                <Input
                  value={editJobForm.company_name}
                  onChange={(e) => setEditJobForm({ ...editJobForm, company_name: e.target.value })}
                  placeholder="e.g. Google"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Job Link URL *</Label>
                <Input
                  value={editJobForm.job_url}
                  onChange={(e) => setEditJobForm({ ...editJobForm, job_url: e.target.value })}
                  placeholder="https://..."
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Status</Label>
                <Select value={editJobForm.status} onValueChange={(v) => setEditJobForm({ ...editJobForm, status: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Employment Type</Label>
                <Select value={editJobForm.employment_type} onValueChange={(v) => setEditJobForm({ ...editJobForm, employment_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {["Full-Time", "Part-Time", "Contract", "Contract-to-Hire", "Internship", "C2C", "W2"].map(t => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Experience Required</Label>
                <Select value={editJobForm.experience_required} onValueChange={(v) => setEditJobForm({ ...editJobForm, experience_required: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select exp..." /></SelectTrigger>
                  <SelectContent>
                    {["0–2 Years", "2–5 Years", "5+ Years", "Senior Level", "Lead / Staff"].map(e => (
                      <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Work Mode</Label>
                <Select value={editJobForm.work_mode} onValueChange={(v) => setEditJobForm({ ...editJobForm, work_mode: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select mode..." /></SelectTrigger>
                  <SelectContent>
                    {["Onsite", "Hybrid", "Remote"].map(wm => (
                      <SelectItem key={wm} value={wm} className="text-xs">{wm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">City</Label>
                <Input
                  value={editJobForm.city}
                  onChange={(e) => setEditJobForm({ ...editJobForm, city: e.target.value })}
                  placeholder="e.g. Austin"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">State</Label>
                <Input
                  value={editJobForm.state}
                  onChange={(e) => setEditJobForm({ ...editJobForm, state: e.target.value })}
                  placeholder="e.g. TX"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Country</Label>
                <Input
                  value={editJobForm.country}
                  onChange={(e) => setEditJobForm({ ...editJobForm, country: e.target.value })}
                  placeholder="e.g. USA"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Salary</Label>
                <Input
                  value={editJobForm.salary}
                  onChange={(e) => setEditJobForm({ ...editJobForm, salary: e.target.value })}
                  placeholder="e.g. $120,000/yr"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Visa Eligibility</Label>
                <Select value={editJobForm.visa_eligibility} onValueChange={(v) => setEditJobForm({ ...editJobForm, visa_eligibility: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select visa..." /></SelectTrigger>
                  <SelectContent>
                    {["OPT", "STEM OPT", "H1B", "H1B Transfer", "USC", "Green Card", "All Work Authorization"].map(ve => (
                      <SelectItem key={ve} value={ve} className="text-xs">{ve}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Resume Link / Used *</Label>
              <Input
                value={editJobForm.resume_used}
                onChange={(e) => setEditJobForm({ ...editJobForm, resume_used: e.target.value })}
                placeholder="Google Drive link of resume"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Job Description</Label>
              <Textarea
                value={editJobForm.job_description}
                onChange={(e) => setEditJobForm({ ...editJobForm, job_description: e.target.value })}
                placeholder="Enter job description..."
                className="min-h-[90px] text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <Button variant="outline" size="sm" onClick={() => setEditJobDialogOpen(false)} disabled={savingEditJob}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEditJob} disabled={savingEditJob} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              {savingEditJob ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Job Confirmation Dialog */}
      <AlertDialog open={!!deleteJobTarget} onOpenChange={(open) => !open && setDeleteJobTarget(null)}>
        <AlertDialogContent className="bg-background rounded-2xl border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Job Application
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-2">
              Are you sure you want to delete the job application for{" "}
              <strong className="text-foreground">
                {deleteJobTarget?.role_title || deleteJobTarget?.title || "this role"}
              </strong>{" "}
              at <strong className="text-foreground">{deleteJobTarget?.company_name || deleteJobTarget?.company}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="h-8 px-3 text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteJob}
              className="h-8 px-3 bg-destructive hover:bg-destructive/90 text-white text-xs font-bold"
            >
              Delete Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CandidateApplicationsPage;
