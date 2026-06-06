import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { candidatesApi, recruitersApi, billingApi } from "@/services/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DataTable } from "@/components/ui/DataTable";
import { formatDate, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Users, FileText, Briefcase, KeyRound, ClipboardList, Plus, Trash2, User, Phone, Shield, AlertTriangle, Sparkles, Loader2, MessageSquare, History, Globe, ExternalLink, Save, ChevronDown, Eye, EyeOff, LayoutDashboard, FileCheck, Calendar as CalendarIcon, Award, UserCheck } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { motion } from "framer-motion";
import RecruiterInterviewsTab from "@/components/recruiter/RecruiterInterviewsTab";
import AdminAuditTab from "@/components/admin/AdminAuditTab";
import ChatTab from "@/components/recruiter/ChatTab";
import DocumentPreview from "@/components/dashboard/DocumentPreview";
import CustomCredentialsDialog from "@/components/dashboard/CustomCredentialsDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const JobDescriptionCell = ({ 
  company, 
  role, 
  description, 
  onReadMore 
}: { 
  company: string; 
  role: string; 
  description?: string; 
  onReadMore: (company: string, role: string, desc: string) => void; 
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
          onReadMore(company, role, description);
        }}
        className="text-primary hover:underline font-semibold ml-1 cursor-pointer"
      >
        Read More
      </button>
    </div>
  );
};


const navItems = [
  { label: "My Candidates", path: "/recruiter-dashboard", icon: <Users className="h-4 w-4" /> },
  { label: "Assigned To", path: "/recruiter-dashboard/assigned-to", icon: <UserCheck className="h-4 w-4" /> },
  { label: "Daily Log", path: "/recruiter-dashboard/daily-log", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "My Profile", path: "/recruiter-dashboard/profile", icon: <User className="h-4 w-4" /> },
];

interface RecruiterCandidateDetailProps {
  candidateId: string;
}

const JOB_STATUSES = ["Applied", "Screening", "Screening Scheduled", "Interview", "Interview Scheduled", "Offer", "Rejected", "No Response"];

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
  const [activeJobDesc, setActiveJobDesc] = useState<{ company: string; role: string; description: string } | null>(null);

  const handleOpenDescription = (company: string, role: string, description: string) => {
    setActiveJobDesc({ company, role, description });
  };

  // Credential form
  const [credForm, setCredForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingCred, setSavingCred] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (k: string) => setShowPasswords(p => ({ ...p, [k]: !p[k] }));

  // Daily log form
  const [logCount, setLogCount] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [jobLinks, setJobLinks] = useState<Array<{ company_name: string; role_title: string; job_url: string; job_description: string; resume_used: string; status: string; }>>([]);
  const [savingLog, setSavingLog] = useState(false);
  const [fetchingJob, setFetchingJob] = useState<Record<number, boolean>>({});

  const fetchAll = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      const { data: cand } = await candidatesApi.detail(candidateId);
      setCandidate(cand);

      if (cand) {
        const [intakeRes, roleRes, credRes, logsRes, jobsRes, subRes] = await Promise.all([
          candidatesApi.getIntake(candidateId).catch(() => ({ data: null })),
          candidatesApi.getRoles(candidateId).catch(() => ({ data: [] })),
          candidatesApi.getCredentials(candidateId).catch(() => ({ data: [] })),
          recruitersApi.getDailyLogs(candidateId).catch(() => ({ data: [] })),
          recruitersApi.getJobApplications(candidateId).catch(() => ({ data: [] })),
          billingApi.subscription(candidateId).catch(() => ({ data: null })),
        ]);
        setIntake(intakeRes.data || null);
        setRoles(roleRes.data || []);
        const creds = credRes.data || [];
        setCredentials(creds);

        // Pre-fill form with existing credentials OR candidate data
        if (creds.length > 0 && creds[0].data) {
          setCredForm(creds[0].data as Record<string, any>);
        } else {
          // Pre-fill with candidate information if no credentials exist
          setCredForm({
            full_legal_name: cand?.profile?.full_name || cand?.full_name || "",
            email: cand?.profile?.email || cand?.email || "",
            phone: cand?.profile?.phone || "",
            linkedin_url: cand?.profile?.linkedin_profile || "",
            current_title: "",
            years_experience: "",
            certifications: "",
            shared_email: cand?.profile?.email || cand?.email || "",
            skills_summary: "",
            personal_email: "",
            location_city_state: "",
            bachelors_graduation_date: "",
            masters_graduation_date: "",
            first_entry_us: "",
            opt_start_date: "",
            opt_offer_letter_submitted: "No",
            preferred_job_roles: "",
            preferred_locations: ""
          });
        }

        const logs = logsRes.data || [];
        setDailyLogs(logs);
        setJobPostings(jobsRes.data || []);
        setSubscription(subRes?.data?.id ? subRes.data : null);
      }
    } catch { }
    if (showLoading) setLoading(false);
  };

  const resumes = useMemo(() => {
    if (!credentials.length || !credentials[0].data) return [];
    const data = credentials[0].data;
    const list = [];
    if (data.primary_resume) list.push({ label: "Primary Resume", url: data.primary_resume });
    if (data.alternate_resume_versions && Array.isArray(data.alternate_resume_versions)) {
      data.alternate_resume_versions.forEach((url: string, i: number) => {
        list.push({ label: `Resume Version ${i + 1}`, url });
      });
    }
    return list;
  }, [credentials]);

  useEffect(() => {
    fetchAll(true);
    const interval = setInterval(() => {
      fetchAll(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [candidateId, user]);

  const handleCredChange = (field: string, value: any) => {
    setCredForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!credForm.full_legal_name?.trim()) newErrors.full_legal_name = "Full legal name is required";
    if (!credForm.personal_email?.trim()) newErrors.personal_email = "Personal email address is required";
    if (!credForm.location_city_state?.trim()) newErrors.location_city_state = "Location (City, State) is required";
    const cleanPhone = credForm.phone?.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) newErrors.phone = "A valid 10-digit phone number is required";
    if (!credForm.bachelors_graduation_date) newErrors.bachelors_graduation_date = "Bachelor's graduation date is required";
    if (!credForm.first_entry_us) newErrors.first_entry_us = "First entry into the U.S. is required";
    if (!credForm.opt_start_date) newErrors.opt_start_date = "OPT start date is required";
    if (!credForm.preferred_job_roles?.trim()) newErrors.preferred_job_roles = "Preferred job roles are required";
    if (!credForm.preferred_locations?.trim()) newErrors.preferred_locations = "Preferred locations are required";
    if (!credForm.linkedin_url?.trim()) newErrors.linkedin_url = "LinkedIn URL is required";
    if (!credForm.work_history_summary?.trim()) newErrors.work_history_summary = "Professional history summary is required";
    if (!credForm.skills_summary?.trim()) newErrors.skills_summary = "Skills summary is required";
    if (!credForm.tools_and_technologies?.trim()) newErrors.tools_and_technologies = "Tools & technologies summary is required";
    if (!credForm.shared_email?.trim()) newErrors.shared_email = "Shared platform email is required";
    if (!credForm.gmail_password?.trim()) newErrors.gmail_password = "Gmail password is required";
    if (!credForm.linkedin_login_id?.trim()) newErrors.linkedin_login_id = "LinkedIn login ID is required";
    if (!credForm.linkedin_password?.trim()) newErrors.linkedin_password = "LinkedIn password is required";
    if (!credForm.visa_details?.trim()) newErrors.visa_details = "Visa details are required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.keys(newErrors)[0];
      const el = document.getElementById(`rc-${firstError}`) || document.getElementsByName(firstError)[0];
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus(); }
      toast({ title: "Missing Information", description: "Please fill in all required fields marked with *", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveCredential = async () => {
    if (!validateForm()) return;
    setSavingCred(true);
    try {
      await candidatesApi.upsertCredential(candidateId, credForm);
      toast({ title: "Credentials saved" });
      setErrors({});
      fetchAll();
    } catch (err: any) {
      const validationErrors = err.response?.data?.validation_errors;
      if (validationErrors) {
        setErrors(validationErrors);
        toast({ title: "Validation Error", description: "Please fix the highlighted fields.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
      }
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
    setJobLinks([...jobLinks, { company_name: "", role_title: "", job_url: "", job_description: "", resume_used: "", status: "Applied" }]);
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

  const handleSubmitDailyLog = async () => {
    if (!logCount || Number(logCount) < 0) {
      toast({ title: "Enter application count", variant: "destructive" }); return;
    }
    setSavingLog(true);
    try {
      await recruitersApi.submitDailyLog(candidateId, {
        applications_count: Number(logCount) || 0,
        notes: logNotes,
      });
      toast({ title: "Daily log submitted" });
      setLogCount(""); setLogNotes("");
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingLog(false);
  };

  const handleSubmitJobApplication = async () => {
    const validLinks = jobLinks.filter(j => j.job_url.trim() || j.company_name.trim());
    if (validLinks.length === 0) {
      toast({ title: "Add at least one job link", variant: "destructive" }); return;
    }
    setSavingLog(true);
    try {
      await recruitersApi.submitJobApplications(candidateId, {
        job_links: validLinks.map(j => ({
          company_name: j.company_name,
          role_title: j.role_title,
          job_url: j.job_url,
          job_description: j.job_description,
          resume_used: j.resume_used,
          status: j.status.toLowerCase().replace(/ /g, "_"),
        })),
      });
      toast({ title: "Job applications submitted" });
      setJobLinks([]);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.error || err.message, variant: "destructive" });
    }
    setSavingLog(false);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto mr-2 inline" /> Loading candidate file...</div>;
  if (!candidate) return <div className="p-8 text-center text-muted-foreground">Candidate not found.</div>;

  const intakeData = intake?.data as Record<string, any> | null;

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
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-none shadow-sm bg-card/60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Total Applications</p>
                    <h3 className="text-2xl font-bold mt-1">{candidate?.total_applications || 0}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-card/60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">Total Interviews</p>
                    <h3 className="text-2xl font-bold mt-1">{candidate?.total_interviews || 0}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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

        <TabsContent value="intake" className="space-y-6">
          <Card className="border-none shadow-sm bg-card/60">
            <CardHeader className="border-b border-border/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Client Intake Sheet</CardTitle>
                  <CardDescription className="text-xs">Comprehensive details provided by the candidate at onboarding.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {intakeData ? (
                <div className="space-y-8 animate-in fade-in duration-350">
                  {!intake.is_locked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs flex items-center gap-2">
                      <Clock className="h-4 w-4" /> This is a draft version. The candidate has not yet submitted and locked this form.
                    </div>
                  )}

                  {/* Personal & Contact Details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Users className="h-4 w-4" /> Personal & Contact Details
                    </h4>
                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">First Name</p>
                        <p className="font-bold text-neutral-900">{intakeData.first_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Last Name</p>
                        <p className="font-bold text-neutral-900">{intakeData.last_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Date of Birth</p>
                        <p className="font-bold text-neutral-900">{intakeData.dob || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Phone Number</p>
                        <p className="font-bold text-neutral-900">{intakeData.phone_number || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Email Address</p>
                        <p className="font-bold text-neutral-900 break-all">{intakeData.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Marketing Email</p>
                        <p className="font-bold text-neutral-900 break-all">{intakeData.marketing_email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Marketing Phone</p>
                        <p className="font-bold text-neutral-900">{intakeData.marketing_phone || "—"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground font-semibold mb-0.5">Current Address</p>
                        <p className="font-bold text-neutral-900 leading-relaxed">{intakeData.current_address || "—"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground font-semibold mb-0.5">Mailing Address</p>
                        <p className="font-bold text-neutral-900 leading-relaxed">{intakeData.mailing_address || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Education Background */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Award className="h-4 w-4" /> Educational Background
                    </h4>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Highest / Master's */}
                      <div className="bg-neutral-50/50 p-4 rounded-xl border space-y-3 text-xs">
                        <p className="font-bold text-primary/80 uppercase tracking-wider text-[10px]">Highest Degree Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <p className="text-muted-foreground font-semibold mb-0.5">University / College</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_uni || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Degree Type</p>
                            <p className="font-bold text-neutral-900">{intakeData.highest_degree || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Major / Field</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_field || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Country</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_country || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Graduation Date</p>
                            <p className="font-bold text-neutral-900">{intakeData.masters_grad_date || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bachelor's */}
                      <div className="bg-neutral-50/50 p-4 rounded-xl border space-y-3 text-xs">
                        <p className="font-bold text-primary/80 uppercase tracking-wider text-[10px]">Bachelor's Degree Details</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <p className="text-muted-foreground font-semibold mb-0.5">University / College</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_uni || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Degree Type</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_degree || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Major / Field</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_field || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Country</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_country || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold mb-0.5">Graduation Date</p>
                            <p className="font-bold text-neutral-900">{intakeData.bachelors_grad_date || "—"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Immigration & U.S. Status */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Immigration & Eligibility
                    </h4>
                    <div className="grid gap-6 sm:grid-cols-3 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Current Visa Status</p>
                        <p className="font-bold text-neutral-900">{intakeData.visa_status || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">First Entry into the U.S.</p>
                        <p className="font-bold text-neutral-900">{intakeData.first_entry_us || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Total Years in the U.S.</p>
                        <p className="font-bold text-neutral-900">{intakeData.total_years_us || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Skills Summary */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-500" /> Technical & Non-Technical Skills
                    </h4>
                    <div className="space-y-3 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Strongly Skilled In</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.skilled_in || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Recently Learned</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.recently_learned || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Experience / Familiarity With</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.experienced_with || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Learning Now</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.learning_now || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold uppercase tracking-wide text-[9px] mb-1">Other Non-Technical Skills</p>
                        <p className="font-medium text-neutral-900 bg-white p-2.5 rounded border leading-relaxed whitespace-pre-wrap">{intakeData.other_non_tech || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Job Preferences */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" /> Job Preferences
                    </h4>
                    <div className="grid gap-6 sm:grid-cols-2 bg-neutral-50/50 p-4 rounded-xl border text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Desired Role</p>
                        <p className="font-bold text-neutral-900 text-sm">{intakeData.desired_role || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-0.5">Desired Years of Experience</p>
                        <p className="font-bold text-neutral-900 text-sm">{intakeData.desired_exp_years || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/40 w-full" />

                  {/* Uploaded Documents */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <FileCheck className="h-4 w-4" /> Uploaded Verification Documents
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { label: "Resume / CV", url: intakeData.resume_url, required: true },
                        { label: "Passport (First & Last Page)", url: intakeData.passport_url, required: true },
                        { label: "Government Issued ID", url: intakeData.gov_id_url, required: true },
                        { label: "Visa / I-797 / I-20", url: intakeData.visa_url, required: true },
                        { label: "Work Authorization Document", url: intakeData.work_auth_url, required: true },
                        { label: "Other Verification Document", url: intakeData.doc_url, required: false },
                      ].map((doc, idx) => (
                        <div key={idx} className="bg-neutral-50 p-4 rounded-xl border flex flex-col justify-between gap-3 text-xs">
                          <div>
                            <p className="font-semibold text-neutral-800">{doc.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{doc.required ? "Mandatory Field" : "Optional Field"}</p>
                          </div>
                          {doc.url ? (
                            <DocumentPreview
                              url={doc.url}
                              label={`View ${doc.label}`}
                              variant="button"
                              className="w-full text-xs font-bold h-9 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                            />
                          ) : (
                            <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 p-2 rounded text-center border border-amber-100">Not Uploaded</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Work Experience dynamic mapping */}
                  {intakeData.experiences && Array.isArray(intakeData.experiences) && intakeData.experiences.length > 0 && (
                    <>
                      <div className="h-[1px] bg-border/40 w-full" />
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                          <Briefcase className="h-4 w-4" /> Professional Work History
                        </h4>
                        <div className="grid gap-6 sm:grid-cols-2">
                          {intakeData.experiences.map((exp: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl bg-neutral-50 border space-y-3 text-xs">
                              <div className="flex items-center justify-between border-b pb-2">
                                <p className="font-bold text-neutral-900 text-sm">{exp.job_title || "—"}</p>
                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold">{exp.job_type || "—"}</span>
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-neutral-800">{exp.company_name || "—"}</p>
                                <p className="text-[11px] text-muted-foreground">{exp.company_address || "—"}</p>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[10px]">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                <span>{exp.start_date || "—"} to {exp.end_date || "Present"}</span>
                              </div>
                              {exp.responsibilities && (
                                <div className="pt-2 border-t mt-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Responsibilities</p>
                                  <p className="text-[11px] text-neutral-700 leading-relaxed bg-white p-2.5 rounded border italic whitespace-pre-wrap">{exp.responsibilities}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Certifications dynamic mapping */}
                  {intakeData.certifications && Array.isArray(intakeData.certifications) && intakeData.certifications.length > 0 && (
                    <>
                      <div className="h-[1px] bg-border/40 w-full" />
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                          <Award className="h-4 w-4" /> Professional Certifications
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {intakeData.certifications.map((cert: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl bg-neutral-50 border space-y-2 text-xs">
                              <p className="font-bold text-neutral-900 text-sm leading-tight">{cert.name || "—"}</p>
                              <p className="font-semibold text-muted-foreground">{cert.organization || "—"}</p>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t text-[10px] text-muted-foreground font-semibold">
                                <span>Issued: {cert.issued_date || "—"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground bg-muted/10 rounded-3xl border border-dashed border-border/50 italic flex flex-col items-center gap-3">
                  <AlertTriangle className="h-8 w-8 opacity-20" />
                  Intake sheet not yet submitted by candidate.
                </div>
              )}
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
              {roles.length > 4 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group mt-4">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
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
                  {[
                    { key: "full_legal_name", colSpan: 2, required: true },
                    { key: "phone", required: true }, { key: "personal_email", required: true },
                    { key: "linkedin_url", required: true }, { key: "location_city_state", required: true },
                    { key: "current_title" }, { key: "years_experience" },
                    { key: "preferred_job_roles", colSpan: 2, required: true },
                    { key: "preferred_locations", colSpan: 2, required: true },
                    { key: "visa_details", colSpan: 2, required: true },
                    { key: "certifications" }, { key: "references_if_needed" }
                  ].map((item) => (
                    <div key={item.key} className={cn("space-y-1.5", item.colSpan === 2 && "sm:col-span-2")}>
                      <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-70", errors[item.key] && "text-destructive")}>{item.key.replace(/_/g, " ")} {item.required && "*"}</Label>
                      <Input
                        id={`rc-${item.key}`}
                        className={cn("bg-background/50 text-sm h-10 border-border/50", errors[item.key] && "border-destructive ring-1 ring-destructive/20")}
                        value={credForm[item.key] || ""}
                        onChange={e => handleCredChange(item.key, e.target.value)}
                      />
                      {errors[item.key] && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors[item.key]}</p>}
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-blue-800 flex items-center gap-2">
                    <Award className="h-3.5 w-3.5" /> Education & OPT Dates
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-70", errors.bachelors_graduation_date && "text-destructive")}>Bachelor's Grad Date *</Label>
                      <DatePicker id="rc-bachelors_graduation_date" value={credForm.bachelors_graduation_date} onChange={val => handleCredChange("bachelors_graduation_date", val)} className={cn(errors.bachelors_graduation_date && "border-destructive ring-1 ring-destructive/20")} />
                      {errors.bachelors_graduation_date && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.bachelors_graduation_date}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Master's Grad Date</Label>
                      <DatePicker id="rc-masters_graduation_date" value={credForm.masters_graduation_date} onChange={val => handleCredChange("masters_graduation_date", val)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-70", errors.first_entry_us && "text-destructive")}>First Entry US *</Label>
                      <DatePicker id="rc-first_entry_us" value={credForm.first_entry_us} onChange={val => handleCredChange("first_entry_us", val)} className={cn(errors.first_entry_us && "border-destructive ring-1 ring-destructive/20")} />
                      {errors.first_entry_us && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.first_entry_us}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-70", errors.opt_start_date && "text-destructive")}>OPT Start Date *</Label>
                      <DatePicker id="rc-opt_start_date" value={credForm.opt_start_date} onChange={val => handleCredChange("opt_start_date", val)} className={cn(errors.opt_start_date && "border-destructive ring-1 ring-destructive/20")} />
                      {errors.opt_start_date && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.opt_start_date}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-amber-800 flex items-center gap-2">
                      <KeyRound className="h-3.5 w-3.5" /> Account Credentials
                    </h4>
                    <CustomCredentialsDialog candidateId={candidateId} readOnly={true} onRefresh={fetchAll} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-70", errors.shared_email && "text-destructive")}>Shared Email (All Platforms) *</Label>
                      <Input id="rc-shared_email" type="email" className={cn("bg-white text-sm h-10 border-amber-200", errors.shared_email && "border-destructive ring-1 ring-destructive/20")} value={credForm["shared_email"] || ""} onChange={e => handleCredChange("shared_email", e.target.value)} placeholder="yourname@gmail.com" />
                      {errors.shared_email && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.shared_email}</p>}
                    </div>
                    {/* Gmail */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-widest text-amber-900", errors.gmail_password && "text-destructive")}>Gmail Password *</Label>
                      <div className="relative">
                        <Input id="rc-gmail_password" type={showPasswords["gmail_password"] ? "text" : "password"} className={cn("bg-white text-sm h-10 border-amber-200 pr-10", errors.gmail_password && "border-destructive ring-1 ring-destructive/20")} value={credForm["gmail_password"] || ""} onChange={e => handleCredChange("gmail_password", e.target.value)} placeholder="••••••••" />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground h-8 w-8" onClick={() => togglePassword("gmail_password")}>{showPasswords["gmail_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                      </div>
                      {errors.gmail_password && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.gmail_password}</p>}
                    </div>
                    {/* LinkedIn */}
                    <div className="space-y-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-widest text-amber-900", errors.linkedin_login_id && "text-destructive")}>LinkedIn Login ID *</Label>
                      <Input id="rc-linkedin_login_id" className={cn("bg-white text-sm h-10 border-amber-200", errors.linkedin_login_id && "border-destructive ring-1 ring-destructive/20")} value={credForm["linkedin_login_id"] || ""} onChange={e => handleCredChange("linkedin_login_id", e.target.value)} placeholder="LinkedIn email/username" />
                      {errors.linkedin_login_id && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.linkedin_login_id}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className={cn("text-[10px] font-bold uppercase tracking-widest text-amber-900", errors.linkedin_password && "text-destructive")}>LinkedIn Password *</Label>
                      <div className="relative">
                        <Input id="rc-linkedin_password" type={showPasswords["linkedin_password"] ? "text" : "password"} className={cn("bg-white text-sm h-10 border-amber-200 pr-10", errors.linkedin_password && "border-destructive ring-1 ring-destructive/20")} value={credForm["linkedin_password"] || ""} onChange={e => handleCredChange("linkedin_password", e.target.value)} placeholder="••••••••" />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground h-8 w-8" onClick={() => togglePassword("linkedin_password")}>{showPasswords["linkedin_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                      </div>
                      {errors.linkedin_password && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.linkedin_password}</p>}
                    </div>
                    {/* Indeed */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Indeed Login ID (Optional)</Label>
                      <Input className="bg-white/50 text-sm h-10 border-amber-100" value={credForm["indeed_login_id"] || ""} onChange={e => handleCredChange("indeed_login_id", e.target.value)} placeholder="Indeed email/username" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Indeed Password (Optional)</Label>
                      <div className="relative">
                        <Input type={showPasswords["indeed_password"] ? "text" : "password"} className="bg-white/50 text-sm h-10 border-amber-100 pr-10" value={credForm["indeed_password"] || ""} onChange={e => handleCredChange("indeed_password", e.target.value)} placeholder="••••••••" />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground h-8 w-8" onClick={() => togglePassword("indeed_password")}>{showPasswords["indeed_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                      </div>
                    </div>
                    {/* Dice */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Dice Login ID (Optional)</Label>
                      <Input className="bg-white/50 text-sm h-10 border-amber-100" value={credForm["dice_login_id"] || ""} onChange={e => handleCredChange("dice_login_id", e.target.value)} placeholder="Dice email/username" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Dice Password (Optional)</Label>
                      <div className="relative">
                        <Input type={showPasswords["dice_password"] ? "text" : "password"} className="bg-white/50 text-sm h-10 border-amber-100 pr-10" value={credForm["dice_password"] || ""} onChange={e => handleCredChange("dice_password", e.target.value)} placeholder="••••••••" />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground h-8 w-8" onClick={() => togglePassword("dice_password")}>{showPasswords["dice_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                      </div>
                    </div>
                    {/* Monster */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Monster Login ID (Optional)</Label>
                      <Input className="bg-white/50 text-sm h-10 border-amber-100" value={credForm["monster_login_id"] || ""} onChange={e => handleCredChange("monster_login_id", e.target.value)} placeholder="Monster email/username" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Monster Password (Optional)</Label>
                      <div className="relative">
                        <Input type={showPasswords["monster_password"] ? "text" : "password"} className="bg-white/50 text-sm h-10 border-amber-100 pr-10" value={credForm["monster_password"] || ""} onChange={e => handleCredChange("monster_password", e.target.value)} placeholder="••••••••" />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground h-8 w-8" onClick={() => togglePassword("monster_password")}>{showPasswords["monster_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                      </div>
                    </div>
                    {/* ZipRecruiter */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">ZipRecruiter Login ID (Optional)</Label>
                      <Input className="bg-white/50 text-sm h-10 border-amber-100" value={credForm["ziprecruiter_login_id"] || ""} onChange={e => handleCredChange("ziprecruiter_login_id", e.target.value)} placeholder="ZipRecruiter email/username" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">ZipRecruiter Password (Optional)</Label>
                      <div className="relative">
                        <Input type={showPasswords["ziprecruiter_password"] ? "text" : "password"} className="bg-white/50 text-sm h-10 border-amber-100 pr-10" value={credForm["ziprecruiter_password"] || ""} onChange={e => handleCredChange("ziprecruiter_password", e.target.value)} placeholder="••••••••" />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground h-8 w-8" onClick={() => togglePassword("ziprecruiter_password")}>{showPasswords["ziprecruiter_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                      </div>
                    </div>
                    {/* Foundit */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-900">Foundit Password (Optional)</Label>
                      <div className="relative">
                        <Input type={showPasswords["foundit_password"] ? "text" : "password"} className="bg-white/50 text-sm h-10 border-amber-100 pr-10" value={credForm["foundit_password"] || ""} onChange={e => handleCredChange("foundit_password", e.target.value)} placeholder="••••••••" />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent text-muted-foreground h-8 w-8" onClick={() => togglePassword("foundit_password")}>{showPasswords["foundit_password"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                      </div>
                    </div>

                  </div>

                  <div className="border-t border-amber-200/50 pt-4 mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Custom Job Platforms</Label>
                      <Button variant="outline" size="sm" className="h-7 text-xs bg-white text-amber-900 border-amber-200" onClick={() => {
                        setCredForm(p => ({
                          ...p,
                          custom_platforms: [...(p.custom_platforms || []), { platform_name: "", username_email: "", password: "" }]
                        }));
                      }}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                    {credForm.custom_platforms?.map((cp: any, idx: number) => (
                      <div key={idx} className="p-2 bg-white/50 rounded-lg relative group">
                        <Button variant="ghost" size="icon" className="absolute -top-1 -right-1 h-5 w-5 bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                          const n = [...credForm.custom_platforms];
                          n.splice(idx, 1);
                          setCredForm({ ...credForm, custom_platforms: n });
                        }}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-amber-700">Platform</Label>
                            <Input className="h-8 text-xs bg-white" placeholder="e.g. Glassdoor" value={cp.platform_name} onChange={e => {
                              const n = [...credForm.custom_platforms];
                              n[idx].platform_name = e.target.value;
                              setCredForm({ ...credForm, custom_platforms: n });
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-amber-700">Username / Email</Label>
                            <Input className="h-8 text-xs bg-white" placeholder="Username or email" value={cp.username_email || ""} onChange={e => {
                              const n = [...credForm.custom_platforms];
                              n[idx].username_email = e.target.value;
                              setCredForm({ ...credForm, custom_platforms: n });
                            }} />
                          </div>
                          <div className="space-y-1 relative">
                            <Label className="text-[9px] font-bold uppercase text-amber-700">Password</Label>
                            <div className="relative">
                              <Input className="h-8 text-xs bg-white pr-8" type={showPasswords[`cp_${idx}`] ? "text" : "password"} value={cp.password} onChange={e => {
                                const n = [...credForm.custom_platforms];
                                n[idx].password = e.target.value;
                                setCredForm({ ...credForm, custom_platforms: n });
                              }} />
                              <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-transparent text-muted-foreground" onClick={() => togglePassword(`cp_${idx}`)}>
                                {showPasswords[`cp_${idx}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-70", errors.work_history_summary && "text-destructive")}>Professional / Work History Summary *</Label>
                    <Textarea id="rc-work_history_summary" rows={5} className={cn("bg-background/50 text-sm border-border/50", errors.work_history_summary && "border-destructive ring-1 ring-destructive/20")} value={credForm["work_history_summary"] || ""} onChange={e => handleCredChange("work_history_summary", e.target.value)} />
                    {errors.work_history_summary && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.work_history_summary}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-70", errors.skills_summary && "text-destructive")}>Skills Summary & Keywords *</Label>
                    <Textarea id="rc-skills_summary" rows={3} className={cn("bg-background/50 text-sm border-border/50", errors.skills_summary && "border-destructive ring-1 ring-destructive/20")} value={credForm["skills_summary"] || ""} onChange={e => handleCredChange("skills_summary", e.target.value)} />
                    {errors.skills_summary && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.skills_summary}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className={cn("text-[10px] font-bold uppercase tracking-widest opacity-70", errors.tools_and_technologies && "text-destructive")}>Tools & Technologies *</Label>
                    <Textarea id="rc-tools_and_technologies" rows={3} className={cn("bg-background/50 text-sm border-border/50", errors.tools_and_technologies && "border-destructive ring-1 ring-destructive/20")} value={credForm["tools_and_technologies"] || ""} onChange={e => handleCredChange("tools_and_technologies", e.target.value)} />
                    {errors.tools_and_technologies && <p className="text-xs text-destructive mt-1 font-semibold animate-in fade-in slide-in-from-top-1">{errors.tools_and_technologies}</p>}
                  </div>
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
                          <span className="text-[10px] text-muted-foreground font-medium">{formatDate(v.created_at)} by {v.edited_by?.profile?.full_name || "Admin"}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(v.data as Record<string, any>).map(([key, val]) => {
                              if (!val || key === "custom_platforms") return null;
                              const isPassword = ["gmail_password", "linkedin_password", "indeed_password", "dice_password", "foundit_password"].includes(key);
                              return (
                                <div key={key} className="bg-muted/30 p-2 rounded-lg border border-border/20 relative group">
                                  <p className="text-[9px] font-bold uppercase opacity-50 tracking-tighter mb-1">{key.replace(/_/g, " ")}</p>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-medium truncate flex-1">
                                      {isPassword ? (showPasswords[`v_${v.id}_${key}`] ? val : "••••••••") : (key.includes('resume') || key.includes('url')) ? (
                                        <DocumentPreview url={val} label="View File" />
                                      ) : val}
                                    </p>
                                    {isPassword && (
                                      <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:bg-transparent" onClick={() => togglePassword(`v_${v.id}_${key}`)}>
                                        {showPasswords[`v_${v.id}_${key}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {v.data?.custom_platforms && Array.isArray(v.data.custom_platforms) && v.data.custom_platforms.length > 0 && (
                            <div className="border-t border-border/10 pt-3">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 mb-2">Custom Platforms</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {v.data.custom_platforms.map((cp: any, idx: number) => (
                                  <div key={idx} className="bg-amber-50/50 p-2 rounded-lg border border-amber-100 flex items-center justify-between gap-2">
                                    <div className="flex-1 overflow-hidden space-y-0.5">
                                      <p className="text-[10px] font-bold text-amber-900 truncate">{cp.platform_name}</p>
                                      <p className="text-[11px] text-amber-800 truncate">Email/ID: <span className="font-medium">{cp.username_email || "N/A"}</span></p>
                                      <p className="text-[11px] font-mono text-amber-700 truncate">PW: {showPasswords[`v_${v.id}_cp_${idx}`] ? cp.password : "••••••••"}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-800/60 hover:bg-transparent align-middle self-center" onClick={() => togglePassword(`v_${v.id}_cp_${idx}`)}>
                                      {showPasswords[`v_${v.id}_cp_${idx}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {v.data?.skills_summary && (
                            <div className="bg-muted/10 p-3 rounded-lg border border-border/20">
                              <p className="text-[9px] font-bold uppercase opacity-50 mb-1 tracking-widest">Skills & Notes</p>
                              <p className="text-xs italic leading-relaxed text-muted-foreground whitespace-pre-wrap">{v.data.skills_summary}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {credentials.length > 5 && (
                  <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                    <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                  </div>
                )}
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

              <Button
                variant="hero"
                className={`w-full h-12 text-sm font-bold tracking-tight rounded-2xl transition-all ${logCount ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/10' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                onClick={handleSubmitDailyLog}
                disabled={savingLog || !logCount}
              >
                {savingLog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-white" />}
                Submit Daily Record
              </Button>

              {/* Daily Log History */}
              {dailyLogs.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border/50">
                  <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
                    <History className="h-4 w-4 text-secondary" /> Journal History
                  </h4>
                  <div className="space-y-3">
                    {dailyLogs.map((log: any, idx: number) => (
                      <div key={idx} className="bg-muted/10 p-4 rounded-xl border border-border/40">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">{formatDate(log.log_date || log.created_at)}</span>
                          <Badge variant="secondary" className="text-[9px] font-bold py-0.5 px-2">Total Applications Submitted Today: {log.total_applications_submitted_today}</Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Notes</p>
                          <p className="text-xs text-foreground font-medium">{log.notes || <span className="italic text-muted-foreground opacity-60">No notes provided.</span>}</p>
                        </div>
                      </div>
                    ))}
                    {dailyLogs.length > 5 && (
                      <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                        <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
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
                        <Input placeholder="Company Name" className="h-9 text-xs bg-background/50" value={job.company_name} onChange={e => updateJobLink(idx, "company_name", e.target.value)} />
                        <Input placeholder="Role Title" className="h-9 text-xs bg-background/50" value={job.role_title} onChange={e => updateJobLink(idx, "role_title", e.target.value)} />
                      </div>
                      <Textarea placeholder="Job Description (Optional)" className="text-xs bg-background/50 min-h-[80px]" value={job.job_description} onChange={e => updateJobLink(idx, "job_description", e.target.value)} />
                      <div className="relative">
                        <Input placeholder="Job Application Link" className="h-9 text-xs bg-background/50 pr-8" value={job.job_url} onChange={e => updateJobLink(idx, "job_url", e.target.value)} />
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-secondary" onClick={() => handleFetchJobDetails(idx)} disabled={fetchingJob[idx]}>
                          {fetchingJob[idx] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder="Add google drive link of resume"
                          className="flex-1 h-9 text-[10px] font-bold bg-background/50"
                          value={job.resume_used}
                          onChange={e => updateJobLink(idx, "resume_used", e.target.value)}
                        />
                        <Select value={job.status} onValueChange={v => updateJobLink(idx, "status", v)}>
                          <SelectTrigger className="w-36 h-9 text-[10px] font-bold bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {JOB_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {jobLinks.length > 3 && (
                        <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                          <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              <Button
                variant="hero"
                className={`w-full h-12 text-sm font-bold tracking-tight rounded-2xl transition-all ${jobLinks.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/10' : 'bg-neutral-300 text-neutral-500 hover:bg-neutral-300 shadow-none pointer-events-none'}`}
                onClick={handleSubmitJobApplication}
                disabled={savingLog || jobLinks.length === 0}
              >
                {savingLog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-white" />}
                Submit Job Application
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card/60 mt-6">
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
                    header: "ID",
                    className: "pl-6 py-4",
                    render: (j: any) => (
                      <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase whitespace-nowrap">
                        {`HYRSUB${j.id.toString().slice(-6).toUpperCase()}`}
                      </span>
                    )
                  },
                  {
                    header: "Company Name",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <span className="font-bold text-sm tracking-tight">{j.company_name || "—"}</span>
                    )
                  },
                  {
                    header: "Role Title",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <span className="text-sm font-medium">{j.role_title || "—"}</span>
                    )
                  },
                  {
                    header: "Job Description",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <JobDescriptionCell 
                        company={j.company_name} 
                        role={j.role_title} 
                        description={j.job_description} 
                        onReadMore={handleOpenDescription} 
                      />
                    )
                  },
                  {
                    header: "Job Link",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      j.job_url ? (
                        <DocumentPreview 
                          url={j.job_url} 
                          label="View Job" 
                          className="inline-flex items-center gap-1 text-xs text-secondary hover:underline cursor-pointer font-semibold" 
                        />
                      ) : "—"
                    )
                  },
                  {
                    header: "Application Status",
                    className: "px-6 py-4",
                    render: (j: any) => (
                      <Select value={(j.application_status || j.status || "").toLowerCase().replace(/ /g, "_")} onValueChange={(v) => handleUpdateJobStatus(j.id, v)}>
                        <SelectTrigger className="w-40 h-8 text-[11px] font-bold border-none bg-muted/50 focus-visible:ring-0">
                          <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_STATUSES.map(s => <SelectItem key={s} value={s.toLowerCase().replace(/ /g, "_")} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )
                  },
                  {
                    header: "Resume Used",
                    className: "px-6 py-4",
                    render: (j: any) => {
                      const isUrl = j.resume_used?.startsWith('http');
                      const resumeName = isUrl ? (resumes.find(r => r.url === j.resume_used)?.label || "View Resume") : (j.resume_used || "Standard");
                      return isUrl ? (
                        <DocumentPreview url={j.resume_used} label={resumeName} className="text-[11px] font-bold" />
                      ) : (
                        <span className="text-xs font-mono opacity-80">{resumeName}</span>
                      );
                    }
                  },
                  {
                    header: "Logged Date",
                    className: "px-6 py-4 text-right pr-6",
                    render: (j: any) => <span className="text-[11px] text-muted-foreground font-medium">{formatDate(j.log_date || j.created_at)}</span>
                  }
                ]}
              />
              {jobPostings.length > 5 && (
                <div className="py-2 flex justify-center border-t border-border/10 bg-muted/5 group">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 animate-bounce group-hover:text-secondary group-hover:opacity-100 transition-all" />
                </div>
              )}
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

      <Dialog open={!!activeJobDesc} onOpenChange={(open) => !open && setActiveJobDesc(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card rounded-2xl p-6 shadow-2xl border border-border/50">
          <DialogHeader className="border-b border-border/10 pb-4">
            <DialogTitle className="text-lg font-bold flex flex-col gap-1 text-left">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Job Description</span>
              <span className="text-card-foreground">{activeJobDesc?.role}</span>
              <span className="text-primary text-sm font-medium">{activeJobDesc?.company}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-[55vh] overflow-y-auto pr-2">
            {activeJobDesc?.description}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterCandidateDetail;
