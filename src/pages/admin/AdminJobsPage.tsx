import { useState, useEffect, useCallback } from "react";
import { jobsApi, candidatesApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {

  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Briefcase, Users, RefreshCw, Search,
  MapPin, Building, Clock, CheckCircle, XCircle,
} from "lucide-react";

const JOB_STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  closed: "bg-gray-100 text-gray-700",
};

const SUB_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  screening: "bg-purple-100 text-purple-800",
  interviewing: "bg-orange-100 text-orange-800",
  offered: "bg-teal-100 text-teal-800",
  placed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-100 text-gray-700",
};

const emptyJob = {
  title: "", company: "", location: "", remote: false,
  description: "", required_skills: "", salary_range: "",
  employment_type: "contract", status: "open",
};

const AdminJobsPage = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Search states
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [subSearch, setSubSearch] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState("all");

  // Job dialog
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [jobForm, setJobForm] = useState({ ...emptyJob });
  const [savingJob, setSavingJob] = useState(false);

  // Submission dialog
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subForm, setSubForm] = useState({ job: "", candidate: "", notes: "" });
  const [savingSub, setSavingSub] = useState(false);

  // Edit submission status
  const [editSubOpen, setEditSubOpen] = useState(false);
  const [editSub, setEditSub] = useState<any>(null);
  const [editSubStatus, setEditSubStatus] = useState("");
  const [editSubNotes, setEditSubNotes] = useState("");

  // Delete confirms
  const [deleteJob, setDeleteJob] = useState<any>(null);
  const [deleteSub, setDeleteSub] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, sRes, cRes, stRes] = await Promise.all([
        jobsApi.list(),
        jobsApi.listSubmissions(),
        candidatesApi.list(),
        jobsApi.stats(),
      ]);
      setJobs(jRes.data?.results ?? []);
      setSubmissions(sRes.data?.results ?? []);
      setCandidates(Array.isArray(cRes.data) ? cRes.data : cRes.data?.results ?? []);
      setStats(stRes.data || {});
    } catch (e: any) {
      toast({ title: "Error loading data", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filtered lists ──
  const filteredJobs = jobs.filter(j => {
    if (jobStatusFilter !== "all" && j.status !== jobStatusFilter) return false;
    if (jobSearch.trim()) {
      const q = jobSearch.toLowerCase();
      return j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredSubs = submissions.filter(s => {
    if (subStatusFilter !== "all" && s.status !== subStatusFilter) return false;
    if (subSearch.trim()) {
      const q = subSearch.toLowerCase();
      return (
        s.candidate_name?.toLowerCase().includes(q) ||
        s.job_title?.toLowerCase().includes(q) ||
        s.job_company?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Job CRUD ──
  const openCreateJob = () => {
    setEditingJob(null);
    setJobForm({ ...emptyJob });
    setJobDialogOpen(true);
  };
  const openEditJob = (job: any) => {
    setEditingJob(job);
    setJobForm({
      title: job.title, company: job.company, location: job.location || "",
      remote: job.remote, description: job.description || "",
      required_skills: Array.isArray(job.required_skills) ? job.required_skills.join(", ") : job.required_skills || "",
      salary_range: job.salary_range || "", employment_type: job.employment_type, status: job.status,
    });
    setJobDialogOpen(true);
  };

  const saveJob = async () => {
    setSavingJob(true);
    try {
      const payload = {
        ...jobForm,
        required_skills: jobForm.required_skills
          ? jobForm.required_skills.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
      };
      if (editingJob) {
        await jobsApi.update(editingJob.id, payload);
        toast({ title: "Job updated" });
      } else {
        await jobsApi.create(payload);
        toast({ title: "Job created" });
      }
      setJobDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
    setSavingJob(false);
  };

  const confirmDeleteJob = async () => {
    if (!deleteJob) return;
    try {
      await jobsApi.delete(deleteJob.id);
      toast({ title: "Job deleted" });
      setDeleteJob(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // ── Submission CRUD ──
  const createSubmission = async () => {
    if (!subForm.job || !subForm.candidate) {
      toast({ title: "Select a job and candidate", variant: "destructive" }); return;
    }
    setSavingSub(true);
    try {
      await jobsApi.createSubmission(subForm);
      toast({ title: "Candidate submitted to job" });
      setSubDialogOpen(false);
      setSubForm({ job: "", candidate: "", notes: "" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
    setSavingSub(false);
  };

  const openEditSub = (sub: any) => {
    setEditSub(sub);
    setEditSubStatus(sub.status);
    setEditSubNotes(sub.notes || "");
    setEditSubOpen(true);
  };

  const saveSubUpdate = async () => {
    if (!editSub) return;
    try {
      await jobsApi.updateSubmission(editSub.id, { status: editSubStatus, notes: editSubNotes });
      toast({ title: "Submission updated" });
      setEditSubOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const confirmDeleteSub = async () => {
    if (!deleteSub) return;
    try {
      await jobsApi.deleteSubmission(deleteSub.id);
      toast({ title: "Submission removed" });
      setDeleteSub(null);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Jobs & Submissions</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage job openings and candidate submissions</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Jobs", value: stats.total_jobs ?? 0, color: "bg-blue-50 text-blue-700" },
          { label: "Open Jobs", value: stats.open_jobs ?? 0, color: "bg-green-50 text-green-700" },
          { label: "Submissions", value: stats.total_submissions ?? 0, color: "bg-purple-50 text-purple-700" },
          { label: "Interviewing", value: stats.interviewing ?? 0, color: "bg-orange-50 text-orange-700" },
          { label: "Placed", value: stats.placed ?? 0, color: "bg-teal-50 text-teal-700" },
        ].map((c) => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className={`p-4 rounded-xl ${c.color}`}>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs font-medium mt-0.5">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs"><Briefcase className="mr-1.5 h-4 w-4" />Job Openings</TabsTrigger>
          <TabsTrigger value="submissions"><Users className="mr-1.5 h-4 w-4" />Submissions</TabsTrigger>
        </TabsList>

        {/* ── Job Openings Tab ── */}
        <TabsContent value="jobs" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search title or company..." className="pl-9" value={jobSearch} onChange={e => setJobSearch(e.target.value)} />
            </div>
            <Select value={jobStatusFilter} onValueChange={setJobStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreateJob}><Plus className="mr-1.5 h-4 w-4" />New Job</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <DataTable
                data={filteredJobs}
                isLoading={loading}
                searchPlaceholder="Search title or company..."
                searchKey="title"
                emptyMessage="No jobs found"
                columns={[
                  { header: "Title", accessorKey: "title", className: "font-medium text-sm" },
                  { 
                    header: "Company", 
                    render: (job: any) => (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />{job.company}
                      </div>
                    )
                  },
                  { 
                    header: "Type", 
                    render: (job: any) => <span className="text-xs text-muted-foreground">{job.employment_type?.replace(/_/g, " ").toUpperCase()}</span>
                  },
                  { 
                    header: "Location", 
                    render: (job: any) => <span className="text-xs text-muted-foreground">{job.remote ? "Remote" : job.location || "—"}</span>
                  },
                  { 
                    header: "Submissions", 
                    render: (job: any) => <Badge variant="secondary" className="text-xs">{job.submissions_count ?? 0}</Badge>
                  },
                  { 
                    header: "Status", 
                    render: (job: any) => (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLORS[job.status] ?? ""}`}>
                        {job.status.replace(/_/g, " ")}
                      </span>
                    )
                  },
                  { 
                    header: "Actions", 
                    render: (job: any) => (
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditJob(job)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteJob(job)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Submissions Tab ── */}
        <TabsContent value="submissions" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search candidate or job..." className="pl-9" value={subSearch} onChange={e => setSubSearch(e.target.value)} />
            </div>
            <Select value={subStatusFilter} onValueChange={setSubStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["submitted", "screening", "interviewing", "offered", "placed", "rejected", "withdrawn"].map(s => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setSubDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />Submit Candidate
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <DataTable
                data={filteredSubs}
                isLoading={loading}
                searchPlaceholder="Search candidate..."
                searchKey="candidate_name"
                emptyMessage="No submissions found"
                columns={[
                  { 
                    header: "Candidate", 
                    render: (sub: any) => (
                      <div>
                        <p className="font-medium text-sm">{sub.candidate_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{sub.candidate_email}</p>
                      </div>
                    )
                  },
                  { header: "Job", accessorKey: "job_title", className: "font-medium text-sm" },
                  { header: "Company", accessorKey: "job_company", className: "text-sm text-muted-foreground" },
                  { header: "Submitted By", accessorKey: "submitted_by_name", className: "text-xs text-muted-foreground" },
                  { 
                    header: "Status", 
                    render: (sub: any) => (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_STATUS_COLORS[sub.status] ?? ""}`}>
                        {sub.status.replace(/_/g, " ")}
                      </span>
                    )
                  },
                  { 
                    header: "Date", 
                    render: (sub: any) => <span className="text-xs text-muted-foreground">{sub.created_at ? new Date(sub.created_at).toLocaleDateString() : "—"}</span>
                  },
                  { 
                    header: "Actions", 
                    render: (sub: any) => (
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSub(sub)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteSub(sub)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ── Create/Edit Job Dialog ── */}
      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? "Edit Job" : "Create Job Opening"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Job Title *</Label>
                <Input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Java Developer" />
              </div>
              <div className="space-y-1.5">
                <Label>Company *</Label>
                <Input value={jobForm.company} onChange={e => setJobForm(f => ({ ...f, company: e.target.value }))} placeholder="Client company" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employment Type</Label>
                <Select value={jobForm.employment_type} onValueChange={v => setJobForm(f => ({ ...f, employment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["contract", "Contract"], ["w2", "W2"], ["c2c", "C2C"], ["full_time", "Full Time"], ["part_time", "Part Time"]].map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={jobForm.status} onValueChange={v => setJobForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} placeholder="City, State or Remote" />
              </div>
              <div className="space-y-1.5">
                <Label>Salary / Rate Range</Label>
                <Input value={jobForm.salary_range} onChange={e => setJobForm(f => ({ ...f, salary_range: e.target.value }))} placeholder="e.g. $80k–$100k or $80/hr" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Required Skills (comma-separated)</Label>
              <Input value={jobForm.required_skills as string} onChange={e => setJobForm(f => ({ ...f, required_skills: e.target.value }))} placeholder="Java, Spring Boot, AWS" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={4} value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} placeholder="Job description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveJob} disabled={savingJob}>{savingJob ? "Saving..." : editingJob ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Submission Dialog ── */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Candidate to Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Job Opening *</Label>
              <Select value={subForm.job} onValueChange={v => setSubForm(f => ({ ...f, job: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a job..." /></SelectTrigger>
                <SelectContent>
                  {jobs.filter(j => j.status === "open").map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.title} — {j.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Candidate *</Label>
              <Select value={subForm.candidate} onValueChange={v => setSubForm(f => ({ ...f, candidate: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a candidate..." /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name || c.email} — {c.status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={subForm.notes} onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes about this submission..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialogOpen(false)}>Cancel</Button>
            <Button onClick={createSubmission} disabled={savingSub}>{savingSub ? "Submitting..." : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Submission Status Dialog ── */}
      <Dialog open={editSubOpen} onOpenChange={setEditSubOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {editSub?.candidate_name} → {editSub?.job_title}
            </p>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editSubStatus} onValueChange={setEditSubStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["submitted", "screening", "interviewing", "offered", "placed", "rejected", "withdrawn"].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={editSubNotes} onChange={e => setEditSubNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubOpen(false)}>Cancel</Button>
            <Button onClick={saveSubUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Job Confirm ── */}
      <AlertDialog open={!!deleteJob} onOpenChange={o => !o && setDeleteJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Opening?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteJob?.title}" and all its submissions will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteJob} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Submission Confirm ── */}
      <AlertDialog open={!!deleteSub} onOpenChange={o => !o && setDeleteSub(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Submission?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSub?.candidate_name}'s submission to "{deleteSub?.job_title}" will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSub} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminJobsPage;
