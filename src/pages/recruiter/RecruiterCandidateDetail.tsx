import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, recruitersApi, billingApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DataTable } from "@/components/ui/DataTable";

import { useToast } from "@/hooks/use-toast";
import { Users, FileText, Briefcase, KeyRound, ClipboardList, Plus, Trash2, User, Phone, Shield, Award, AlertTriangle, Sparkles, Loader2, MessageSquare, History, Globe, ExternalLink, Save } from "lucide-react";
import { motion } from "framer-motion";
import RecruiterInterviewsTab from "@/components/recruiter/RecruiterInterviewsTab";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import ChatTab from "@/components/recruiter/ChatTab";

const navItems = [
  { label: "My Candidates", path: "/recruiter-dashboard", icon: <Users className="h-4 w-4" /> },
  { label: "Daily Log", path: "/recruiter-dashboard/daily-log", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "My Profile", path: "/recruiter-dashboard/profile", icon: <User className="h-4 w-4" /> },
];

interface RecruiterCandidateDetailProps {
  candidateId: string;
}

const JOB_STATUSES = ["Applied", "Screening Scheduled", "Interview Scheduled", "Offer", "Rejected"];

const RecruiterCandidateDetail = ({ candidateId }: RecruiterCandidateDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<any>(null);
  const [intake, setIntake] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Credential form
  const [credForm, setCredForm] = useState<Record<string, string>>({});
  const [savingCred, setSavingCred] = useState(false);

  // Daily log form
  const [logCount, setLogCount] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [jobLinks, setJobLinks] = useState<Array<{ company_name: string; role_title: string; job_url: string; resume_used: string; status: string; }>>([]);
  const [savingLog, setSavingLog] = useState(false);
  const [fetchingJob, setFetchingJob] = useState<Record<number, boolean>>({});

  const fetchAll = async () => {
    if (!user) return;
    try {
      const { data: cand } = await candidatesApi.detail(candidateId);
      setCandidate(cand);

      if (cand) {
        const [intakeRes, roleRes, credRes, logsRes, subRes] = await Promise.all([
          candidatesApi.getIntake(candidateId).catch(() => ({ data: null })),
          candidatesApi.getRoles(candidateId).catch(() => ({ data: [] })),
          candidatesApi.getCredentials(candidateId).catch(() => ({ data: [] })),
          recruitersApi.getDailyLogs(candidateId).catch(() => ({ data: [] })),
          billingApi.subscription(candidateId).catch(() => ({ data: null })),
        ]);
        setIntake(intakeRes.data || null);
        setRoles(roleRes.data || []);
        const creds = credRes.data || [];
        setCredentials(creds);
        if (creds.length > 0 && creds[0].data) setCredForm(creds[0].data as Record<string, string>);
        const logs = logsRes.data || [];
        setDailyLogs(logs);
        const allJobs = logs.flatMap((l: any) => (l.job_entries || []).map((j: any) => ({ ...j, log_date: l.log_date })));
        setJobPostings(allJobs);
        setSubscription(subRes?.data?.id ? subRes.data : null);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [candidateId, user]);

  const handleSaveCredential = async () => {
    if (!credForm.full_legal_name?.trim()) {
      toast({ title: "Full legal name is required", variant: "destructive" }); return;
    }
    setSavingCred(true);
    try {
      await candidatesApi.upsertCredential(candidateId, credForm);
      toast({ title: "Credentials saved" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingCred(false);
  };

  const handleUpdateJobStatus = async (jobId: string, status: string) => {
    try {
      const normalizedStatus = status.toLowerCase().replace(/ /g, "_");
      await recruitersApi.updateJobStatus(jobId, normalizedStatus);
      toast({ title: "Application status updated" });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const addJobLink = () => {
    setJobLinks([...jobLinks, { company_name: "", role_title: "", job_url: "", resume_used: "", status: "Applied" }]);
  };

  const updateJobLink = (idx: number, field: string, value: string) => {
    const updated = [...jobLinks];
    (updated[idx] as any)[field] = value;
    setJobLinks(updated);
  };

  const removeJobLink = (idx: number) => {
    setJobLinks(jobLinks.filter((_, i) => i !== idx));
  };

  const handleFetchJobDetails = async (idx: number) => {
    const url = jobLinks[idx].job_url;
    if (!url || !url.startsWith("http")) {
      toast({ title: "Valid URL required", variant: "destructive" }); return;
    }
    setFetchingJob(prev => ({ ...prev, [idx]: true }));
    try {
      const { data } = await recruitersApi.fetchJobDetails(url);
      if (data.role_title || data.company_name) {
        const updated = [...jobLinks];
        if (data.role_title) updated[idx].role_title = data.role_title;
        if (data.company_name) updated[idx].company_name = data.company_name;
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

  const handleSubmitDailyLog = async () => {
    if (!logCount || Number(logCount) < 0) {
      toast({ title: "Enter application count", variant: "destructive" }); return;
    }
    setSavingLog(true);
    try {
      await recruitersApi.submitDailyLog(candidateId, {
        applications_count: Number(logCount),
        notes: logNotes,
        job_links: jobLinks
          .filter(j => j.job_url.trim() || j.company_name.trim())
          .map(j => ({
            company_name: j.company_name,
            role_title: j.role_title,
            job_url: j.job_url,
            resume_used: j.resume_used,
            status: j.status.toLowerCase().replace(/ /g, "_"),
          })),
      });
      toast({ title: "Daily log submitted" });
      setLogCount(""); setLogNotes(""); setJobLinks([]);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingLog(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto mr-2 inline" /> Loading candidate file...</div>;
  if (!candidate) return <div className="p-8 text-center text-muted-foreground">Candidate not found.</div>;

  const intakeData = intake?.data as Record<string, string> | null;

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={candidate.status} />
          <h2 className="text-xl font-bold">{candidate?.profile?.full_name || candidate?.full_name || "Unknown"}</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{candidate?.email || candidate?.profile?.email || ""}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.history.back()} className="rounded-xl px-4">
          ← Back to Dashboard
        </Button>
      </div>

      {/* Banners */}
      {candidate.status === "placed" && (
        <Card className="mb-6 border-secondary/50 bg-secondary/10 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-6 w-6 text-secondary" />
            <p className="font-semibold text-secondary-foreground text-sm">Success! Candidate Placed. Submission logs are now archived.</p>
          </CardContent>
        </Card>
      )}
      {subscription && ["past_due", "canceled", "unpaid", "grace_period", "paused"].includes(subscription.status) && (
        <Card className="mb-6 border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-bold text-destructive text-sm italic">Billing Restriction Active — Marketing Suspended</p>
              <p className="text-xs text-destructive/80 mt-0.5">Marketing activities are disabled until the candidate resolves their subscription issue.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap justify-start border border-border/50 rounded-2xl shadow-sm">
          {[
            { value: "overview", label: "Overview", icon: <User className="h-3.5 w-3.5" /> },
            { value: "intake", label: "Intake", icon: <FileText className="h-3.5 w-3.5" /> },
            { value: "roles", label: "Roles", icon: <Briefcase className="h-3.5 w-3.5" /> },
            { value: "credentials", label: "Credentials", icon: <KeyRound className="h-3.5 w-3.5" /> },
            { value: "daily-log", label: "Daily Log", icon: <ClipboardList className="h-3.5 w-3.5" /> },
            { value: "applications", label: "Applications", icon: <Globe className="h-3.5 w-3.5" /> },
            { value: "interviews", label: "Interviews", icon: <Phone className="h-3.5 w-3.5" /> },
            { value: "messages", label: "Messages", icon: <MessageSquare className="h-3.5 w-3.5" /> },
            { value: "audit", label: "Audit", icon: <Shield className="h-3.5 w-3.5" /> },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-xl px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-semibold gap-2">
              {t.icon} {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="border-none shadow-sm bg-card/60">
            <CardHeader><CardTitle className="text-base font-bold">Registration Data</CardTitle></CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Full Name</p>
                <p className="font-medium">{candidate?.profile?.full_name || candidate?.full_name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Email Address</p>
                <p className="font-medium">{candidate?.profile?.email || candidate?.email || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Phone Number</p>
                <p className="font-medium">{candidate?.profile?.phone || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Visa Status</p>
                <p className="font-medium bg-secondary/10 text-secondary w-fit px-2 py-0.5 rounded text-xs">{candidate?.profile?.visa_status || candidate.visa_status || "N/A"}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Current Location</p>
                 <p className="font-medium">{candidate?.profile?.current_location || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intake" className="space-y-4">
          <Card className="border-none shadow-sm bg-card/60">
            <CardHeader>
              <CardTitle className="text-base font-bold">Client Intake Sheet</CardTitle>
              <CardDescription>Comprehensive details provided by the candidate at onboarding.</CardDescription>
            </CardHeader>
            <CardContent>
              {intakeData ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                  {Object.entries(intakeData).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">{key.replace(/_/g, " ")}</p>
                      <p className="font-medium text-card-foreground break-words">{String(value) || "—"}</p>
                    </div>
                  ))}
                </div>
              ) : <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed italic">Intake sheet not yet submitted by candidate.</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card className="border-none shadow-sm bg-card/60">
            <CardHeader><CardTitle className="text-base font-bold flex items-center gap-2"><Briefcase className="h-5 w-5 text-secondary" /> Preferred Roles</CardTitle></CardHeader>
            <CardContent>
              {roles.length === 0 ? <p className="text-muted-foreground text-center py-8">No specific roles confirmed yet.</p> : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {roles.map((r: any) => (
                    <div key={r.id} className="flex flex-col gap-2 rounded-2xl border border-border/50 p-4 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm tracking-tight">{r.role_title}</p>
                        <StatusBadge status={r.candidate_confirmed ? "active" : r.candidate_confirmed === false ? "rejected" : "pending"} />
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{r.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-none shadow-sm bg-card/60">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-500" /> Professional Credentials</CardTitle>
                <CardDescription>Update candidate details. Every save is versioned for transparency.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    {["full_legal_name", "email", "phone", "linkedin_url", "current_title", "years_experience", "certifications"].map((field) => (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">{field.replace(/_/g, " ")}</Label>
                        <Input className="bg-background/50 text-sm h-10 border-border/50" value={credForm[field] || ""} onChange={e => setCredForm(prev => ({ ...prev, [field]: e.target.value }))} />
                      </div>
                    ))}
                </div>

                <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-amber-800 flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5" /> Account Credentials
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Shared Email (All Platforms) *</Label>
                      <Input type="email" className="bg-white text-sm h-10 border-border/50" value={credForm["shared_email"] || ""} onChange={e => setCredForm(prev => ({ ...prev, "shared_email": e.target.value }))} />
                    </div>
                    {["gmail_password", "linkedin_password", "indeed_password", "dice_password", "foundit_password"].map((field) => (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">{field.replace(/_/g, " ")} {["gmail_password", "linkedin_password"].includes(field) ? "*" : "(Optional)"}</Label>
                        <Input type="password" className="bg-white text-sm h-10 border-border/50" value={credForm[field] || ""} onChange={e => setCredForm(prev => ({ ...prev, [field]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Skills Summary & Keywords</Label>
                    <Textarea rows={5} className="bg-background/50 text-sm border-border/50 italic" value={credForm["skills_summary"] || ""} onChange={e => setCredForm(prev => ({ ...prev, ["skills_summary"]: e.target.value }))} />
                </div>
                <Button variant="secondary" className="w-full h-11 text-white font-bold rounded-xl gap-2 shadow-lg shadow-secondary/20" onClick={handleSaveCredential} disabled={savingCred}>
                  {savingCred ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Finalize and Update Credentials
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-muted/20">
              <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><History className="h-4 w-4" /> Version History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {credentials.map((v: any, idx) => (
                    <AccordionItem key={v.id} value={v.id} className="border-b border-border/40 px-4">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-xs font-bold">Version {v.version}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">{new Date(v.created_at).toLocaleDateString()} by {v.edited_by?.profile?.full_name || "Admin"}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                         <div className="space-y-3 pt-2">
                            {Object.entries(v.data as Record<string, string>).map(([key, val]) => val && (
                                <div key={key} className="border-b border-border/10 pb-1 last:border-0">
                                    <p className="text-[9px] font-bold uppercase opacity-50 tracking-tighter">{key.replace(/_/g, " ")}</p>
                                    <p className="text-[11px] leading-relaxed truncate">
                                      {["gmail_password", "linkedin_password", "indeed_password", "dice_password", "foundit_password"].includes(key) 
                                        ? "••••••••" 
                                        : val}
                                    </p>
                                </div>
                            ))}
                         </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {credentials.length === 0 && <p className="p-6 text-center text-xs text-muted-foreground italic">No prior versions recorded.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="daily-log" className="space-y-6">
          <Card className="border-none shadow-sm bg-card/60 overflow-hidden">
             <div className="h-1 bg-secondary w-full" />
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-secondary" /> Daily Submission Journal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">Total Applications Submitted Today *</Label>
                  <Input type="number" min="0" value={logCount} onChange={e => setLogCount(e.target.value)} placeholder="Enter count..." className="h-11 bg-background/50 border-border/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest opacity-60">General Internal Notes</Label>
                  <Input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Recruiter notes for today..." className="h-11 bg-background/50 border-border/50" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">Jobs & URLs <span className="text-[11px] font-medium text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full">{jobLinks.length}</span></h4>
                  <Button variant="ghost" size="sm" onClick={addJobLink} className="h-8 text-[11px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/5 rounded-lg border border-secondary/20">
                     <Plus className="mr-1 h-3 w-3" /> Add Job Link
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
                           <Input placeholder="Company Name" className="h-9 text-xs bg-background/50" value={job.company_name} onChange={e => updateJobLink(idx, "company_name", e.target.value)} />
                           <Input placeholder="Role Title" className="h-9 text-xs bg-background/50" value={job.role_title} onChange={e => updateJobLink(idx, "role_title", e.target.value)} />
                        </div>
                        <div className="relative">
                            <Input placeholder="Paste Job URL here..." className="h-9 text-xs bg-background/50 pr-8" value={job.job_url} onChange={e => updateJobLink(idx, "job_url", e.target.value)} />
                            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-secondary" onClick={() => handleFetchJobDetails(idx)} disabled={fetchingJob[idx]}>
                                {fetchingJob[idx] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            </Button>
                        </div>
                        <div className="flex items-center gap-3">
                            <Input placeholder="Resume Used (e.g. SDE-2024.pdf)" className="h-9 text-[10px] bg-background/50" value={job.resume_used} onChange={e => updateJobLink(idx, "resume_used", e.target.value)} />
                            <Select value={job.status} onValueChange={v => updateJobLink(idx, "status", v)}>
                                <SelectTrigger className="w-36 h-9 text-[10px] font-bold bg-background/50"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {JOB_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Button variant="hero" className="w-full h-12 text-sm font-bold tracking-tight rounded-2xl shadow-xl shadow-primary/10" onClick={handleSubmitDailyLog} disabled={savingLog || !logCount}>
                {savingLog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-white" />}
                Submit Daily Record
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card className="border-none shadow-sm bg-card/60">
            <CardHeader><CardTitle className="text-base font-bold">Submission Pipeline</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={jobPostings}
                isLoading={loading}
                searchPlaceholder="Search company..."
                searchKey="company_name"
                emptyMessage="No applications recorded in the system."
                columns={[
                  { 
                    header: "Company & Role", 
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-bold text-sm tracking-tight">{j.company_name || "—"}</p>
                          <p className="text-[11px] text-muted-foreground">{j.role_title || "—"}</p>
                        </div>
                        {j.job_url && (
                          <a href={j.job_url} target="_blank" rel="noreferrer" className="text-secondary hover:underline cursor-pointer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    )
                  },
                  { 
                    header: "Application Status", 
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <Select defaultValue={j.application_status} onValueChange={(v) => handleUpdateJobStatus(j.id, v)}>
                        <SelectTrigger className="w-40 h-8 text-[11px] font-bold border-none bg-muted/50 focus-visible:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_STATUSES.map(s => <SelectItem key={s} value={s.toLowerCase().replace(/ /g, "_")} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )
                  },
                  { 
                    header: "Resume Version", 
                    className: "px-6 py-4",
                    render: (j: any) => <span className="text-xs font-mono opacity-80">{j.resume_used || "Standard"}</span>
                  },
                  { 
                    header: "Logged Date", 
                    className: "px-6 py-4 text-right pr-6",
                    render: (j: any) => <span className="text-[11px] text-muted-foreground font-medium">{new Date(j.log_date || j.created_at).toLocaleDateString()}</span>
                  }
                ]}
              />
            </CardContent>

          </Card>
        </TabsContent>

        <TabsContent value="interviews">
          <RecruiterInterviewsTab candidateId={candidateId} candidateUserId={candidate.user_id} />
        </TabsContent>

        <TabsContent value="messages">
          <ChatTab candidateId={candidateId} />
        </TabsContent>

        <TabsContent value="audit">
          <AdminAuditTab targetId={candidateId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecruiterCandidateDetail;
