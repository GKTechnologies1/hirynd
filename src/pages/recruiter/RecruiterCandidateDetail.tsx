import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
import { Users, FileText, Briefcase, KeyRound, ClipboardList, Plus, Trash2, User } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  // Credential form
  const [credForm, setCredForm] = useState<Record<string, string>>({});
  const [savingCred, setSavingCred] = useState(false);

  // Daily log form
  const [logCount, setLogCount] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [jobLinks, setJobLinks] = useState<Array<{ company_name: string; role_title: string; job_url: string; resume_used: string; status: string; }>>([]);
  const [savingLog, setSavingLog] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    const { data: cand } = await supabase.from("candidates").select("*").eq("id", candidateId).single();
    setCandidate(cand);

    if (cand) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", cand.user_id).single();
      setProfile(prof);

      const { data: intakeData } = await supabase.from("client_intake_sheets").select("*").eq("candidate_id", cand.id).maybeSingle();
      setIntake(intakeData);

      const { data: roleData } = await supabase.from("role_suggestions").select("*").eq("candidate_id", cand.id).order("created_at");
      setRoles(roleData || []);

      const { data: credData } = await supabase.from("credential_intake_sheets").select("*").eq("candidate_id", cand.id).order("version", { ascending: false });
      setCredentials(credData || []);
      if (credData && credData.length > 0) {
        setCredForm(credData[0].data as Record<string, string>);
      }

      const { data: logs } = await supabase.from("daily_submission_logs").select("*").eq("candidate_id", cand.id).eq("recruiter_id", user.id).order("log_date", { ascending: false });
      setDailyLogs(logs || []);

      if (logs && logs.length > 0) {
        const logIds = logs.map((l: any) => l.id);
        const { data: jobs } = await supabase.from("job_postings").select("*").in("submission_log_id", logIds).order("created_at", { ascending: false });
        setJobPostings(jobs || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [candidateId, user]);

  const handleSaveCredential = async () => {
    if (!credForm.full_legal_name?.trim()) {
      toast({ title: "Full legal name is required", variant: "destructive" }); return;
    }
    setSavingCred(true);
    const { error } = await supabase.rpc("upsert_credential_intake", {
      _candidate_id: candidateId,
      _form_data: credForm as any,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Credentials saved" }); fetchAll(); }
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

  const handleSubmitDailyLog = async () => {
    if (!logCount || Number(logCount) < 0) {
      toast({ title: "Enter application count", variant: "destructive" }); return;
    }
    setSavingLog(true);

    // Create daily log
    const { data: logData, error: logError } = await supabase
      .from("daily_submission_logs")
      .insert({
        candidate_id: candidateId,
        recruiter_id: user!.id,
        applications_count: Number(logCount),
        notes: logNotes,
      })
      .select()
      .single();

    if (logError) {
      toast({ title: "Error", description: logError.message, variant: "destructive" });
      setSavingLog(false);
      return;
    }

    // Insert job postings
    if (jobLinks.length > 0 && logData) {
      const validJobs = jobLinks.filter(j => j.job_url.trim() || j.company_name.trim());
      if (validJobs.length > 0) {
        const { error: jobError } = await supabase.from("job_postings").insert(
          validJobs.map(j => ({
            candidate_id: candidateId,
            submission_log_id: logData.id,
            company_name: j.company_name,
            role_title: j.role_title,
            job_url: j.job_url,
            resume_used: j.resume_used,
            status: j.status.toLowerCase().replace(/ /g, "_"),
          }))
        );
        if (jobError) {
          toast({ title: "Jobs error", description: jobError.message, variant: "destructive" });
        }
      }
    }

    toast({ title: "Daily log submitted" });
    setLogCount(""); setLogNotes(""); setJobLinks([]);
    fetchAll();
    setSavingLog(false);
  };

  if (loading) return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Loading...</p></DashboardLayout>;
  if (!candidate) return <DashboardLayout title="Candidate Detail" navItems={navItems}><p className="text-muted-foreground">Candidate not found.</p></DashboardLayout>;

  const intakeData = intake?.data as Record<string, string> | null;

  return (
    <DashboardLayout title={`Candidate: ${profile?.full_name || "Unknown"}`} navItems={navItems}>
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={candidate.status} />
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>← Back</Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="daily-log">Daily Log</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {profile?.full_name}</div>
              <div><span className="text-muted-foreground">Email:</span> {profile?.email}</div>
              <div><span className="text-muted-foreground">Phone:</span> {profile?.phone || "—"}</div>
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
          {candidate.status === "paid" || ["credential_completed", "active_marketing", "placed"].includes(candidate.status) ? (
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
                      <Input placeholder="Job URL" value={job.job_url} onChange={e => updateJobLink(idx, "job_url", e.target.value)} />
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
                      const logJobs = jobPostings.filter((j: any) => j.submission_log_id === log.id);
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
      </Tabs>
    </DashboardLayout>
  );
};

export default RecruiterCandidateDetail;
