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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Users, FileText, Briefcase, KeyRound, ClipboardList, Plus, Trash2, User, Phone, Shield, Award, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import RecruiterInterviewsTab from "@/components/recruiter/RecruiterInterviewsTab";
import AdminAuditTab from "@/components/admin/AdminAuditTab";

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
  const [profile, setProfile] = useState<any>(null);
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
        const allJobs = logs.flatMap((l: any) => l.job_entries || []);
        setJobPostings(allJobs);
        setSubscription(subRes.data?.id ? subRes.data : null);
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

  if (loading) return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  if (!candidate) return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Candidate not found.</p></DashboardLayout>;

  const intakeData = intake?.data as Record<string, string> | null;

  return (
    <DashboardLayout title={`Candidate: ${candidate?.profile?.full_name || "Unknown"}`} navItems={navItems}>
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={candidate.status} />
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>← Back</Button>
      </div>

      {/* Placed / Paused / Cancelled Banners */}
      {candidate.status === "placed" && (
        <Card className="mb-4 border-secondary/50 bg-secondary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-6 w-6 text-secondary" />
            <p className="font-semibold text-card-foreground">Case Closed — Candidate Placed. Daily logs are locked.</p>
          </CardContent>
        </Card>
      )}
      {["paused", "cancelled"].includes(candidate.status) && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="font-semibold text-card-foreground capitalize">{candidate.status} — Daily logs are disabled.</p>
          </CardContent>
        </Card>
      )}
      {subscription && ["past_due", "canceled", "unpaid", "grace_period", "paused"].includes(subscription.status) && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-semibold text-card-foreground">Billing Issue — Marketing paused</p>
              <p className="text-sm text-muted-foreground">This candidate has a billing issue. Daily logs and credential edits are disabled until resolved.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="daily-log">Daily Log</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {candidate?.profile?.full_name}</div>
              <div><span className="text-muted-foreground">Email:</span> {candidate?.profile?.email}</div>
              <div><span className="text-muted-foreground">Phone:</span> {candidate?.profile?.phone || "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> {candidate.status.replace(/_/g, " ")}</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intake (read-only) */}
        <TabsContent value="intake" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Client Intake Sheet</CardTitle><CardDescription>Read-only</CardDescription></CardHeader>
            <CardContent>
              {intakeData ? (
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  {Object.entries(intakeData).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                      <span className="text-card-foreground">{value || "—"}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground">Not submitted yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles (read-only) */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Confirmed Roles</CardTitle></CardHeader>
            <CardContent>
              {roles.length === 0 ? <p className="text-muted-foreground">No roles yet.</p> : (
                <div className="space-y-2">
                  {roles.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="font-medium">{r.role_title}</p>
                        {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                      </div>
                      <StatusBadge status={r.candidate_confirmed ? "active" : r.candidate_confirmed === false ? "rejected" : "pending"} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credentials (editable via RPC) */}
        <TabsContent value="credentials" className="space-y-4">
          {(candidate.status === "paid" || ["credential_completed", "active_marketing", "placed"].includes(candidate.status)) && !(subscription && ["past_due", "canceled", "unpaid", "grace_period", "paused"].includes(subscription?.status)) ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Edit Credentials</CardTitle>
                  <CardDescription>Changes are versioned and audited.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {["full_legal_name", "email", "phone", "linkedin_url", "current_title", "years_experience", "certifications", "skills_summary"].map((field) => (
                    <div key={field}>
                      <Label className="capitalize">{field.replace(/_/g, " ")}</Label>
                      {field === "skills_summary" ? (
                        <Textarea value={credForm[field] || ""} onChange={e => setCredForm(prev => ({ ...prev, [field]: e.target.value }))} />
                      ) : (
                        <Input value={credForm[field] || ""} onChange={e => setCredForm(prev => ({ ...prev, [field]: e.target.value }))} />
                      )}
                    </div>
                  ))}
                  <Button variant="hero" onClick={handleSaveCredential} disabled={savingCred}>
                    {savingCred ? "Saving..." : "Save Credentials"}
                  </Button>
                </CardContent>
              </Card>

              {credentials.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Version History</CardTitle></CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible>
                      {credentials.map((v: any) => (
                        <AccordionItem key={v.id} value={v.id}>
                          <AccordionTrigger>
                            <span className="text-sm">v{v.version} — {new Date(v.created_at).toLocaleString()}</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid gap-2 text-sm sm:grid-cols-2">
                              {Object.entries(v.data as Record<string, string>).map(([key, val]) => val ? (
                                <div key={key}><span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span> {val}</div>
                              ) : null)}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="p-6"><p className="text-muted-foreground">Credential editing requires paid status.</p></CardContent></Card>
          )}
        </TabsContent>

        {/* Daily Log */}
        <TabsContent value="daily-log" className="space-y-4">
          {["placed", "paused", "cancelled"].includes(candidate.status) || (subscription && ["past_due", "canceled", "unpaid", "grace_period", "paused"].includes(subscription?.status)) ? (
            <Card><CardContent className="p-6"><p className="text-muted-foreground">Daily logs are disabled{subscription && ["past_due", "canceled", "unpaid"].includes(subscription?.status) ? " due to billing issue" : ` for ${candidate.status} candidates`}.</p></CardContent></Card>
          ) : (
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Submit Daily Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Applications Submitted *</Label>
                  <Input type="number" min="0" value={logCount} onChange={e => setLogCount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Optional notes" />
                </div>
              </div>

              {/* Job Links */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Job Postings</Label>
                  <Button variant="outline" size="sm" onClick={addJobLink}><Plus className="mr-1 h-3 w-3" /> Add Job</Button>
                </div>
                {jobLinks.map((job, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input placeholder="Company Name" value={job.company_name} onChange={e => updateJobLink(idx, "company_name", e.target.value)} />
                      <Input placeholder="Role Title" value={job.role_title} onChange={e => updateJobLink(idx, "role_title", e.target.value)} />
                      <div className="relative">
                        <Input placeholder="Job URL" value={job.job_url} onChange={e => updateJobLink(idx, "job_url", e.target.value)} className="pr-10" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-secondary hover:text-secondary/80"
                          onClick={() => handleFetchJobDetails(idx)}
                          disabled={fetchingJob[idx]}
                          title="Auto-fetch job details"
                        >
                          {fetchingJob[idx] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <Input placeholder="Resume Used (URL)" value={job.resume_used} onChange={e => updateJobLink(idx, "resume_used", e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={job.status} onValueChange={v => updateJobLink(idx, "status", v)}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {JOB_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => removeJobLink(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="hero" onClick={handleSubmitDailyLog} disabled={savingLog || !logCount}>
                {savingLog ? "Submitting..." : "Submit Daily Log"}
              </Button>
            </CardContent>
          </Card>

          {/* Log History */}
          {dailyLogs.length > 0 && (
            <Card>
              <CardHeader><CardTitle>My Submission History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Jobs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyLogs.map((log: any) => {
                      const logJobs = log.job_entries || [];
                      return (
                        <TableRow key={log.id}>
                          <TableCell>{new Date(log.log_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{log.applications_count}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{log.notes || "—"}</TableCell>
                          <TableCell>{logJobs.length} link(s)</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          </>
          )}
        </TabsContent>

        {/* Applications overview */}
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>All Job Postings</CardTitle></CardHeader>
            <CardContent>
              {jobPostings.length === 0 ? <p className="text-muted-foreground">No job postings yet.</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobPostings.map((j: any) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium">{j.company_name || "—"}</TableCell>
                        <TableCell>{j.role_title || "—"}</TableCell>
                        <TableCell><StatusBadge status={j.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interviews */}
        <TabsContent value="interviews">
          <RecruiterInterviewsTab candidateId={candidateId} candidateUserId={candidate.user_id} />
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit">
          <AdminAuditTab candidateId={candidateId} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default RecruiterCandidateDetail;
